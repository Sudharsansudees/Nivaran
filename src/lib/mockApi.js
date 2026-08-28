// The mocked backend. Same exported shape as the original Supabase-backed
// api.js so pages didn't need to change — but everything here runs
// entirely in the browser (localStorage), with no network calls and
// nothing that can go down. This is the intentional, spec-sanctioned
// "mock the backend... only needs to work for judges" version.
import { DEPARTMENTS } from './departments'
import { getCurrentUser } from './mockAuth'

const GRIEVANCES_KEY = 'nivaran_mock_grievances'
const EVENTS_KEY = 'nivaran_mock_status_events'
const CONFIRMATIONS_KEY = 'nivaran_mock_confirmations'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() {
  return crypto.randomUUID()
}

function allGrievances() {
  return readJSON(GRIEVANCES_KEY, {})
}

function allEvents() {
  return readJSON(EVENTS_KEY, {})
}

function allConfirmations() {
  return readJSON(CONFIRMATIONS_KEY, {})
}

function requireUser() {
  const user = getCurrentUser()
  if (!user) throw new Error('Not signed in.')
  return user
}

// ---------- Grievances ----------

export async function listMyGrievances() {
  const user = requireUser()
  return Object.values(allGrievances())
    .filter((g) => g.citizen_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function listDepartmentGrievances() {
  const user = requireUser()
  return Object.values(allGrievances())
    .filter((g) => g.department === user.department)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function getGrievance(id) {
  const g = allGrievances()[id]
  if (!g) throw new Error('Grievance not found.')
  return g
}

export async function getStatusEvents(grievanceId) {
  return (allEvents()[grievanceId] ?? []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export async function createGrievance({ citizenId, department, description, slaDays = 7 }) {
  const grievances = allGrievances()
  const id = uid()
  const grievance = {
    id,
    citizen_id: citizenId,
    department,
    description,
    status: 'filed',
    created_at: new Date().toISOString(),
    sla_days: slaDays,
    reopened_count: 0,
  }
  grievances[id] = grievance
  writeJSON(GRIEVANCES_KEY, grievances)
  return grievance
}

// ---------- State machine (mirrors the original Edge Function) ----------

function officerGuard(ctx) {
  if (ctx.callerRole !== 'officer') return 'Only an officer can perform this action.'
  if (ctx.callerDept !== ctx.grievance.department) {
    return 'This officer is not in the department that owns this grievance.'
  }
  return null
}

function owningCitizenGuard(ctx) {
  if (ctx.callerRole !== 'citizen' || ctx.callerId !== ctx.grievance.citizen_id) {
    return 'Only the citizen who filed this grievance can respond to it.'
  }
  return null
}

const TRANSITIONS = [
  {
    from: 'filed',
    event: 'AI_CLASSIFIED',
    to: 'categorized',
    guard: (ctx) => (ctx.payload?.classification?.department ? null : 'A classification result is required.'),
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
    guard: officerGuard,
    note: () => 'Picked up by the department.',
  },
  {
    from: 'in_progress',
    event: 'DEPT_MARKED_DISPOSED',
    to: 'awaiting_confirmation',
    guard: (ctx) => {
      const officerError = officerGuard(ctx)
      if (officerError) return officerError
      if (!ctx.payload?.disposalType || !ctx.payload?.remark) return 'A disposal type and remark are required.'
      return null
    },
    note: (ctx) => `Marked disposed (${ctx.payload.disposalType}): ${ctx.payload.remark}`,
  },
  {
    from: 'in_progress',
    event: 'OFFICER_RETURNED_NOT_PERTAINING',
    to: 'categorized',
    guard: officerGuard,
    note: () => 'Returned by the department — not pertaining to them.',
  },
  {
    from: 'awaiting_confirmation',
    event: 'CITIZEN_CONFIRMED_FIXED',
    to: 'verified_closed',
    guard: owningCitizenGuard,
    note: () => 'Citizen confirmed the issue is fixed.',
    confirmationAnswer: true,
  },
  {
    from: 'awaiting_confirmation',
    event: 'CITIZEN_SAID_NOT_FIXED',
    to: 'escalated',
    guard: owningCitizenGuard,
    note: () => 'Citizen reported the issue is not fixed.',
    confirmationAnswer: false,
    incrementReopen: true,
  },
  {
    from: 'escalated',
    event: 'REASSIGNED_SENIOR',
    to: 'in_progress',
    guard: officerGuard,
    note: (ctx) => (ctx.payload?.note ? `Reassigned to a senior officer: ${ctx.payload.note}` : 'Reassigned to a senior officer.'),
  },
  {
    from: 'awaiting_confirmation',
    event: 'SLA_TIMEOUT_NO_RESPONSE',
    to: 'escalated',
    guard: (ctx) => (ctx.callerRole === 'system' ? null : 'This event can only be fired by the scheduled SLA check.'),
    note: () => 'Escalated automatically — no citizen response within the SLA window.',
  },
]

export async function transitionGrievance({ grievanceId, event, payload = {} }) {
  const user = requireUser()
  const grievances = allGrievances()
  const grievance = grievances[grievanceId]
  if (!grievance) throw new Error('Grievance not found.')

  const transition = TRANSITIONS.find((t) => t.from === grievance.status && t.event === event)
  if (!transition) {
    throw new Error(`No transition '${event}' from status '${grievance.status}'.`)
  }

  const ctx = {
    callerId: user.id,
    callerRole: user.role,
    callerDept: user.department,
    grievance,
    payload,
  }
  const guardError = transition.guard(ctx)
  if (guardError) throw new Error(guardError)

  grievance.status = transition.to
  if (transition.incrementReopen) grievance.reopened_count += 1
  grievances[grievanceId] = grievance
  writeJSON(GRIEVANCES_KEY, grievances)

  const events = allEvents()
  const list = events[grievanceId] ?? []
  list.push({
    id: uid(),
    grievance_id: grievanceId,
    state: transition.to,
    actor: user.role,
    note: transition.note(ctx),
    created_at: new Date().toISOString(),
  })
  events[grievanceId] = list
  writeJSON(EVENTS_KEY, events)

  if (transition.confirmationAnswer !== undefined) {
    const confirmations = allConfirmations()
    confirmations[grievanceId] = { grievance_id: grievanceId, citizen_answer: transition.confirmationAnswer, created_at: new Date().toISOString() }
    writeJSON(CONFIRMATIONS_KEY, confirmations)
  }

  return { status: transition.to }
}

// Demo-only helper: the real build fires this automatically via a daily
// cron once a grievance sits in awaiting_confirmation past its SLA. There's
// no server here to run that on a schedule, so this lets you show the
// same path in a live demo without waiting days.
export async function simulateSlaTimeout(grievanceId) {
  const grievances = allGrievances()
  const grievance = grievances[grievanceId]
  if (!grievance) throw new Error('Grievance not found.')
  const transition = TRANSITIONS.find((t) => t.event === 'SLA_TIMEOUT_NO_RESPONSE')
  const ctx = { callerId: null, callerRole: 'system', callerDept: null, grievance, payload: {} }
  if (transition.from !== grievance.status) {
    throw new Error(`Grievance must be awaiting_confirmation, not ${grievance.status}.`)
  }

  grievance.status = transition.to
  grievances[grievanceId] = grievance
  writeJSON(GRIEVANCES_KEY, grievances)

  const events = allEvents()
  const list = events[grievanceId] ?? []
  list.push({
    id: uid(),
    grievance_id: grievanceId,
    state: transition.to,
    actor: 'system',
    note: transition.note(ctx),
    created_at: new Date().toISOString(),
  })
  events[grievanceId] = list
  writeJSON(EVENTS_KEY, events)

  return { status: transition.to }
}

// ---------- Simulated AI (no external calls — see README) ----------

const KEYWORD_DEPARTMENTS = [
  { department: 'Water Supply', keywords: ['water', 'tap', 'pipe', 'leak', 'sewage', 'drain'] },
  { department: 'Electricity', keywords: ['power', 'electric', 'transformer', 'voltage', 'streetlight', 'street light'] },
  { department: 'Roads & Infrastructure', keywords: ['road', 'pothole', 'bridge', 'footpath', 'pavement', 'construction'] },
  { department: 'Sanitation & Waste', keywords: ['garbage', 'waste', 'trash', 'sanitation', 'sewer', 'dump'] },
  { department: 'Public Health', keywords: ['hospital', 'clinic', 'health', 'disease', 'mosquito', 'medicine'] },
  { department: 'Education', keywords: ['school', 'teacher', 'college', 'student', 'classroom'] },
  { department: 'Police & Public Safety', keywords: ['police', 'crime', 'theft', 'safety', 'harassment', 'traffic'] },
]

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function aiClassify(description) {
  await delay(400) // small delay so it still *feels* like a request, not instant magic
  const text = description.toLowerCase()
  for (const entry of KEYWORD_DEPARTMENTS) {
    const hit = entry.keywords.find((k) => text.includes(k))
    if (hit) {
      return {
        department: entry.department,
        confidence: 0.86,
        reason: `Mentions "${hit}", which typically falls under ${entry.department}.`,
      }
    }
  }
  return {
    department: 'Other',
    confidence: 0.4,
    reason: "Couldn't confidently match this to a specific department — please double-check.",
  }
}

export async function aiSummarize(statusEvents) {
  await delay(400)
  if (!statusEvents.length) return { summary: 'This grievance has just been filed and is awaiting classification.' }
  const latest = statusEvents[statusEvents.length - 1]
  const summaries = {
    filed: 'Your grievance has been received and is waiting to be classified.',
    categorized: 'Your grievance has been classified and is waiting for the department to pick it up.',
    in_progress: 'The department has picked up your grievance and is working on it.',
    awaiting_confirmation: 'The department says this has been resolved — we\'re waiting for you to confirm.',
    verified_closed: 'This grievance is resolved and closed — you confirmed the fix yourself.',
    escalated: 'This grievance has been escalated and is being handled by a senior officer.',
  }
  return { summary: summaries[latest.state] ?? `Current status: ${latest.state}.` }
}

export async function aiDraftEscalation({ description, statusEvents }) {
  await delay(400)
  const rounds = statusEvents.filter((e) => e.state === 'escalated').length
  return {
    draft:
      `I'm writing to escalate my grievance regarding: "${description}"\n\n` +
      `Despite the department marking this as resolved, the issue has not actually been fixed` +
      `${rounds > 1 ? ` (this is now the ${rounds}${rounds === 2 ? 'nd' : 'th'} time)` : ''}. ` +
      `I would appreciate this being reviewed by a senior officer and addressed properly this time.\n\n` +
      `Thank you for your attention to this matter.`,
  }
}

export { DEPARTMENTS }
