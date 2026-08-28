// Server-side state machine. This is the ONLY place grievances.status is
// ever written from — the frontend has no update grant on that column
// (see the RLS policies in supabase/migrations/0001_init.sql), so every
// status change, from any client, has to come through here.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type Ctx = {
  callerId: string | null
  callerRole: 'citizen' | 'officer' | 'system'
  callerDept: string | null
  grievance: Record<string, any>
  payload: Record<string, any>
}

type TransitionDef = {
  from: string
  event: string
  to: string
  guard: (ctx: Ctx) => string | null
  note: (ctx: Ctx) => string
  incrementReopen?: boolean
  confirmationAnswer?: boolean
}

const TRANSITIONS: TransitionDef[] = [
  {
    from: 'filed',
    event: 'AI_CLASSIFIED',
    to: 'categorized',
    guard: (ctx) => {
      const c = ctx.payload?.classification
      if (!c || !c.department) return 'A classification result is required.'
      return null
    },
    note: (ctx) => {
      const c = ctx.payload.classification
      const conf = c.confidence != null ? ` (${Math.round(c.confidence * 100)}% confidence)` : ''
      return `AI classified as ${c.department}${conf}${c.reason ? ` — ${c.reason}` : ''}`
    },
  },
  {
    from: 'categorized',
    event: 'DEPT_PICKED_UP',
    to: 'in_progress',
    guard: (ctx) => officerGuard(ctx),
    note: () => 'Picked up by the department.',
  },
  {
    from: 'in_progress',
    event: 'DEPT_MARKED_DISPOSED',
    to: 'awaiting_confirmation',
    guard: (ctx) => {
      const officerError = officerGuard(ctx)
      if (officerError) return officerError
      if (!ctx.payload?.disposalType || !ctx.payload?.remark) {
        return 'A disposal type and remark are required.'
      }
      return null
    },
    note: (ctx) => `Marked disposed (${ctx.payload.disposalType}): ${ctx.payload.remark}`,
  },
  {
    from: 'in_progress',
    event: 'OFFICER_RETURNED_NOT_PERTAINING',
    to: 'categorized',
    guard: (ctx) => officerGuard(ctx),
    note: () => 'Returned by the department — not pertaining to them.',
  },
  {
    from: 'awaiting_confirmation',
    event: 'CITIZEN_CONFIRMED_FIXED',
    to: 'verified_closed',
    guard: (ctx) => owningCitizenGuard(ctx),
    note: () => 'Citizen confirmed the issue is fixed.',
    confirmationAnswer: true,
  },
  {
    from: 'awaiting_confirmation',
    event: 'CITIZEN_SAID_NOT_FIXED',
    to: 'escalated',
    guard: (ctx) => owningCitizenGuard(ctx),
    note: () => 'Citizen reported the issue is not fixed.',
    confirmationAnswer: false,
    incrementReopen: true,
  },
  {
    from: 'escalated',
    event: 'REASSIGNED_SENIOR',
    to: 'in_progress',
    guard: (ctx) => officerGuard(ctx),
    note: (ctx) =>
      ctx.payload?.note
        ? `Reassigned to a senior officer: ${ctx.payload.note}`
        : 'Reassigned to a senior officer.',
  },
  {
    from: 'awaiting_confirmation',
    event: 'SLA_TIMEOUT_NO_RESPONSE',
    to: 'escalated',
    guard: (ctx) =>
      ctx.callerRole === 'system'
        ? null
        : 'This event can only be fired by the scheduled SLA check.',
    note: () => 'Escalated automatically — no citizen response within the SLA window.',
  },
]

function officerGuard(ctx: Ctx): string | null {
  if (ctx.callerRole !== 'officer') return 'Only an officer can perform this action.'
  if (ctx.callerDept !== ctx.grievance.department) {
    return 'This officer is not in the department that owns this grievance.'
  }
  return null
}

function owningCitizenGuard(ctx: Ctx): string | null {
  if (ctx.callerRole !== 'citizen' || ctx.callerId !== ctx.grievance.citizen_id) {
    return 'Only the citizen who filed this grievance can respond to it.'
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let body: { grievanceId?: string; event?: string; payload?: Record<string, any> }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { grievanceId, event, payload = {} } = body
  if (!grievanceId || !event) {
    return jsonResponse({ error: 'grievanceId and event are required' }, 400)
  }

  // Two ways to call this function: (1) an end-user JWT, resolved to a
  // citizen/officer profile below, or (2) the SLA cron, authenticated by
  // a shared secret instead of a user session.
  const cronSecret = req.headers.get('x-cron-secret')
  let callerId: string | null = null
  let callerRole: Ctx['callerRole']
  let callerDept: string | null = null

  if (cronSecret) {
    if (cronSecret !== CRON_SECRET) return jsonResponse({ error: 'Invalid cron secret' }, 401)
    callerRole = 'system'
  } else {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await asUser.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401)

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, department')
      .eq('id', userData.user.id)
      .single()
    if (profileError || !profile) return jsonResponse({ error: 'No profile for this user' }, 401)

    callerId = userData.user.id
    callerRole = profile.role
    callerDept = profile.department
  }

  const { data: grievance, error: grievanceError } = await admin
    .from('grievances')
    .select('*')
    .eq('id', grievanceId)
    .single()
  if (grievanceError || !grievance) return jsonResponse({ error: 'Grievance not found' }, 404)

  const transition = TRANSITIONS.find((t) => t.from === grievance.status && t.event === event)
  if (!transition) {
    return jsonResponse(
      { error: `No transition '${event}' from status '${grievance.status}'.` },
      400
    )
  }

  const ctx: Ctx = { callerId, callerRole, callerDept, grievance, payload }
  const guardError = transition.guard(ctx)
  if (guardError) return jsonResponse({ error: guardError }, 400)

  const { error: rpcError } = await admin.rpc('apply_grievance_transition', {
    p_grievance_id: grievanceId,
    p_new_status: transition.to,
    p_actor: callerRole,
    p_note: transition.note(ctx),
    p_increment_reopen: transition.incrementReopen ?? false,
    p_confirmation_answer: transition.confirmationAnswer ?? null,
  })
  if (rpcError) return jsonResponse({ error: rpcError.message }, 500)

  return jsonResponse({ status: transition.to })
})