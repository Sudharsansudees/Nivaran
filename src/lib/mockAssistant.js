// The chat assistant's "brain" — rule-based intent detection over the
// same mocked backend everything else uses (aiClassify, createGrievance,
// transitionGrievance, listMyGrievances). No external calls, so it can't
// fail or hang; kept separate from ChatWidget.jsx so the conversation
// logic is testable independent of the UI.
import { DEPARTMENTS } from './departments'
import { aiClassify, createGrievance, listMyGrievances, transitionGrievance } from './mockApi'
import { STATUS_LABELS } from '../components/StatusBadge'

export const GREETING =
  "Hi, I'm the Nivaran assistant. Tell me what's wrong and I'll help you file a grievance, or ask me to check on one you've already filed."

export const initialAssistantState = { stage: 'idle' }

function findNamedDepartment(text) {
  const lower = text.toLowerCase()
  return DEPARTMENTS.find((d) => lower.includes(d.toLowerCase()) || lower.includes(d.split(' ')[0].toLowerCase()))
}

async function fileGrievance({ citizenId, description, classification }) {
  const grievance = await createGrievance({ citizenId, department: classification.department, description })
  await transitionGrievance({ grievanceId: grievance.id, event: 'AI_CLASSIFIED', payload: { classification } })
  return grievance
}

async function describeStatus() {
  const list = await listMyGrievances()
  if (!list.length) {
    return "You haven't filed anything yet — want to file one now? Just describe the issue."
  }
  const lines = list
    .slice(0, 5)
    .map((g) => `• #${g.id.slice(0, 8)} (${STATUS_LABELS[g.status] ?? g.status}) — ${g.description}`)
  return `Here's what you've filed:\n${lines.join('\n')}`
}

// Returns { reply, state, grievanceId? }. grievanceId is set only when a
// grievance was just filed, so the UI can offer a "View it" link.
export async function handleAssistantMessage(rawText, state, citizenId) {
  const text = rawText.trim()
  const lower = text.toLowerCase()

  if (state.stage === 'confirming_department') {
    if (/^\s*(y|yes|yeah|yep|sure|go ahead)\s*$/i.test(text)) {
      const grievance = await fileGrievance({ citizenId, description: state.description, classification: state.classification })
      return {
        reply: `Filed as #${grievance.id.slice(0, 8)} under ${state.classification.department}. You can track it anytime from your dashboard.`,
        state: initialAssistantState,
        grievanceId: grievance.id,
      }
    }
    if (/^\s*(n|no|nope)\s*$/i.test(text)) {
      return {
        reply: `No problem — which department should this go to? Options: ${DEPARTMENTS.join(', ')}.`,
        state: { stage: 'awaiting_department', description: state.description },
      }
    }
    const named = findNamedDepartment(text)
    if (named) {
      const grievance = await fileGrievance({
        citizenId,
        description: state.description,
        classification: { department: named, confidence: null, reason: 'Department selected by citizen via chat.' },
      })
      return {
        reply: `Filed as #${grievance.id.slice(0, 8)} under ${named}.`,
        state: initialAssistantState,
        grievanceId: grievance.id,
      }
    }
    return {
      reply: `Sorry, I didn't catch a department in that — try one of: ${DEPARTMENTS.join(', ')}. Or just say "yes" to go with ${state.classification.department}.`,
      state,
    }
  }

  if (state.stage === 'awaiting_department') {
    const named = findNamedDepartment(text)
    if (!named) {
      return {
        reply: `That's not one I recognize — pick one of: ${DEPARTMENTS.join(', ')}.`,
        state,
      }
    }
    const grievance = await fileGrievance({
      citizenId,
      description: state.description,
      classification: { department: named, confidence: null, reason: 'Department selected by citizen via chat.' },
    })
    return {
      reply: `Filed as #${grievance.id.slice(0, 8)} under ${named}.`,
      state: initialAssistantState,
      grievanceId: grievance.id,
    }
  }

  // Fresh message — figure out intent.
  if (/\b(status|track|check on|my grievance|my complaint)\b/.test(lower)) {
    return { reply: await describeStatus(), state: initialAssistantState }
  }

  if (/^(hi|hello|hey|help|what can you do)\b/.test(lower) && text.length < 30) {
    return { reply: GREETING, state: initialAssistantState }
  }

  if (text.length < 6) {
    return { reply: "Could you say a bit more about what's wrong?", state: initialAssistantState }
  }

  // Treat anything else as a grievance description.
  const classification = await aiClassify(text)
  return {
    reply:
      `This sounds like a ${classification.department} issue ` +
      `(${Math.round(classification.confidence * 100)}% confident) — ${classification.reason} ` +
      `Should I file it under ${classification.department}? (yes, or name a different department)`,
    state: { stage: 'confirming_department', description: text, classification },
  }
}
