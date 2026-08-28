-- Nivaran schema: tables, row-level security, and the one privileged
-- write path (apply_grievance_transition) used by the Edge Functions.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table profiles (
  id uuid references auth.users primary key,
  role text not null check (role in ('citizen', 'officer')),
  name text,
  department text -- null for citizens
);

create table grievances (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references profiles(id) not null,
  department text not null,
  description text not null,
  status text not null default 'filed' check (status in (
    'filed', 'categorized', 'in_progress', 'awaiting_confirmation',
    'verified_closed', 'escalated'
  )),
  created_at timestamptz not null default now(),
  sla_days int,
  reopened_count int not null default 0
);

create table status_events (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid references grievances(id) not null,
  state text not null,
  actor text not null check (actor in ('citizen', 'officer', 'system')),
  note text,
  created_at timestamptz not null default now()
);
-- append-only: no update/delete policy is granted to any role below

create table confirmations (
  grievance_id uuid references grievances(id) primary key,
  citizen_answer boolean not null,
  created_at timestamptz not null default now()
);

create index status_events_grievance_id_idx on status_events(grievance_id);
create index grievances_department_idx on grievances(department);
create index grievances_citizen_id_idx on grievances(citizen_id);

-- ---------------------------------------------------------------------
-- Helpers — read the caller's own profile. These are used inside
-- profiles' own RLS policies (see profiles_select_related_citizen
-- below), so they MUST be security definer: a security-invoker function
-- querying profiles from within a policy defined on profiles itself
-- causes Postgres to reject it at runtime with "infinite recursion
-- detected in policy for relation profiles". Running as definer bypasses
-- RLS for this one hardcoded, auth.uid()-scoped lookup — it can never
-- return anything but the caller's own row, so this doesn't grant any
-- broader access than the caller already had.
-- ---------------------------------------------------------------------

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select department from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_role_name from public, anon;
revoke all on function public.current_department from public, anon;
grant execute on function public.current_role_name to authenticated, service_role;
grant execute on function public.current_department to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------

alter table profiles enable row level security;
alter table grievances enable row level security;
alter table status_events enable row level security;
alter table confirmations enable row level security;

-- profiles: everyone can read their own row.
create policy "profiles_select_own"
on profiles for select
to authenticated
using (id = auth.uid());

-- profiles: an officer may also read the profile of a citizen who has a
-- grievance filed against the officer's own department (needed to show
-- the citizen's name on the department queue).
create policy "profiles_select_related_citizen"
on profiles for select
to authenticated
using (
  public.current_role_name() = 'officer'
  and exists (
    select 1 from grievances g
    where g.citizen_id = profiles.id
      and g.department = public.current_department()
  )
);

-- profiles: self-provisioning is limited to the citizen role. Nobody can
-- grant themselves 'officer' through this path — officer rows are only
-- ever inserted by a service-role seed script.
create policy "profiles_insert_self_citizen"
on profiles for insert
to authenticated
with check (id = auth.uid() and role = 'citizen');

-- grievances: citizens see and file their own.
create policy "grievances_select_own_citizen"
on grievances for select
to authenticated
using (citizen_id = auth.uid());

create policy "grievances_insert_own_citizen"
on grievances for insert
to authenticated
with check (
  citizen_id = auth.uid()
  and status = 'filed'
  and public.current_role_name() = 'citizen'
);

-- grievances: officers see everything filed under their own department.
create policy "grievances_select_department_officer"
on grievances for select
to authenticated
using (
  public.current_role_name() = 'officer'
  and department = public.current_department()
);

-- No update/delete policy is granted to 'authenticated' on grievances at
-- all — only the service-role key (used inside the transition-grievance
-- Edge Function, which bypasses RLS) may change grievances.status.

-- status_events: read-only audit trail, scoped the same way as the
-- parent grievance. No insert/update/delete policy exists for
-- 'authenticated' — rows are written only by the service role via
-- apply_grievance_transition(), making the trail tamper-proof at the
-- database level, not just by app convention.
create policy "status_events_select_citizen"
on status_events for select
to authenticated
using (
  exists (
    select 1 from grievances g
    where g.id = status_events.grievance_id
      and g.citizen_id = auth.uid()
  )
);

create policy "status_events_select_officer"
on status_events for select
to authenticated
using (
  public.current_role_name() = 'officer'
  and exists (
    select 1 from grievances g
    where g.id = status_events.grievance_id
      and g.department = public.current_department()
  )
);

-- confirmations: same read scoping; written only by the service role.
create policy "confirmations_select_citizen"
on confirmations for select
to authenticated
using (
  exists (
    select 1 from grievances g
    where g.id = confirmations.grievance_id
      and g.citizen_id = auth.uid()
  )
);

create policy "confirmations_select_officer"
on confirmations for select
to authenticated
using (
  public.current_role_name() = 'officer'
  and exists (
    select 1 from grievances g
    where g.id = confirmations.grievance_id
      and g.department = public.current_department()
  )
);

-- ---------------------------------------------------------------------
-- The one privileged write path. Only callable by service_role (i.e.
-- only from inside an Edge Function using the service-role key, never
-- from the browser with the anon key). Runs as a single statement-batch
-- inside one implicit transaction, so the status update, the audit row,
-- and the optional confirmation row all land atomically.
-- ---------------------------------------------------------------------

create or replace function public.apply_grievance_transition(
  p_grievance_id uuid,
  p_new_status text,
  p_actor text,
  p_note text default null,
  p_increment_reopen boolean default false,
  p_confirmation_answer boolean default null
)
returns void
language plpgsql
security invoker
as $$
begin
  update grievances
  set status = p_new_status,
      reopened_count = case when p_increment_reopen then reopened_count + 1 else reopened_count end
  where id = p_grievance_id;

  insert into status_events (grievance_id, state, actor, note)
  values (p_grievance_id, p_new_status, p_actor, p_note);

  if p_confirmation_answer is not null then
    -- A grievance can cycle through awaiting_confirmation more than once
    -- (dispute -> escalate -> reassign -> disposed again). confirmations
    -- holds the citizen's latest answer; the full history of each round
    -- already lives in status_events, so upserting here doesn't lose
    -- anything and keeps the one-row-per-grievance schema from failing
    -- on a second round.
    insert into confirmations (grievance_id, citizen_answer, created_at)
    values (p_grievance_id, p_confirmation_answer, now())
    on conflict (grievance_id)
    do update set citizen_answer = excluded.citizen_answer, created_at = excluded.created_at;
  end if;
end;
$$;

revoke all on function public.apply_grievance_transition from public, anon, authenticated;
grant execute on function public.apply_grievance_transition to service_role;

-- ---------------------------------------------------------------------
-- View used by the SLA-timeout cron to find awaiting_confirmation cases
-- past their SLA with no citizen response. Locked to service_role only.
-- ---------------------------------------------------------------------

create or replace view public.grievances_overdue_confirmation as
select g.id as grievance_id
from grievances g
join lateral (
  select created_at
  from status_events se
  where se.grievance_id = g.id and se.state = 'awaiting_confirmation'
  order by se.created_at desc
  limit 1
) latest_event on true
where g.status = 'awaiting_confirmation'
  -- confirmations is upserted per grievance (see apply_grievance_transition),
  -- so on a reopened case an older round's row would otherwise look like a
  -- response to the *current* round — only count it if it's newer than the
  -- status_event that put this grievance into awaiting_confirmation.
  and not exists (
    select 1 from confirmations c
    where c.grievance_id = g.id and c.created_at >= latest_event.created_at
  )
  and now() > latest_event.created_at + (coalesce(g.sla_days, 7) || ' days')::interval;

revoke all on public.grievances_overdue_confirmation from public, anon, authenticated;
grant select on public.grievances_overdue_confirmation to service_role;