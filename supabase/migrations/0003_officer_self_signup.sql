-- Adds open officer self-signup (src/pages/OfficerSignup.jsx). This is a
-- deliberate trade-off, made explicitly for this hackathon build: the
-- original design only allowed officer accounts to be seeded by an
-- operator (see supabase/seed/seedOfficers.mjs), matching how real
-- government portal access is provisioned rather than self-registered.
-- Opening self-signup means anyone can grant themselves 'officer' access
-- for any department and see that department's grievances — there is no
-- invite code or approval step gating it.
create policy "profiles_insert_self_officer"
on profiles for insert
to authenticated
with check (id = auth.uid() and role = 'officer' and department is not null);
