// All LLM calls happen here, server-side, so the API key never ships to
// the browser. Requires a valid Supabase session (citizen or officer) so
// the key can't be hammered by anonymous callers.
//
// Uses Groq (free tier, no card required) rather than OpenAI — its chat
// completions API is wire-compatible with OpenAI's, so this is otherwise
// the same code an OpenAI-backed version would use.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { DEPARTMENTS } from '../_shared/departments.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile'

async function callLLM(messages: { role: string; content: string }[], jsonMode: boolean) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq request failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.choices[0].message.content as string
}

function eventsToText(statusEvents: { state: string; actor: string; note?: string; created_at: string }[]) {
  return statusEvents
    .map((e) => `- [${e.created_at}] ${e.state} (by ${e.actor})${e.note ? `: ${e.note}` : ''}`)
    .join('\n')
}

async function classify(description: string) {
  const content = await callLLM(
    [
      {
        role: 'system',
        content:
          `You triage citizen grievances for a government portal. Choose exactly one department from this list: ${DEPARTMENTS.join(', ')}. ` +
          `Respond with strict JSON: {"department": string, "confidence": number between 0 and 1, "reason": short string}.`,
      },
      { role: 'user', content: description },
    ],
    true
  )
  const parsed = JSON.parse(content)
  if (!DEPARTMENTS.includes(parsed.department)) parsed.department = 'Other'
  return parsed
}

async function summarize(statusEvents: any[]) {
  const content = await callLLM(
    [
      {
        role: 'system',
        content:
          'You explain the status of a government grievance case to the citizen who filed it, in plain, reassuring, non-bureaucratic language. 2-3 sentences, no jargon.',
      },
      { role: 'user', content: `Case history:\n${eventsToText(statusEvents)}` },
    ],
    false
  )
  return { summary: content.trim() }
}

async function draftEscalation(description: string, statusEvents: any[]) {
  const content = await callLLM(
    [
      {
        role: 'system',
        content:
          'Draft a short, polite, firm escalation message a citizen can send when a government department did not actually resolve their grievance. Reference the original issue and what happened since. No subject line, no signature block.',
      },
      {
        role: 'user',
        content: `Original grievance:\n${description}\n\nCase history:\n${eventsToText(statusEvents)}`,
      },
    ],
    false
  )
  return { draft: content.trim() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await asUser.auth.getUser()
  if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401)

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  try {
    switch (body.action) {
      case 'classify': {
        if (!body.description) return jsonResponse({ error: 'description is required' }, 400)
        return jsonResponse(await classify(body.description))
      }
      case 'summarize': {
        if (!Array.isArray(body.statusEvents)) {
          return jsonResponse({ error: 'statusEvents array is required' }, 400)
        }
        return jsonResponse(await summarize(body.statusEvents))
      }
      case 'draft-escalation': {
        if (!body.description || !Array.isArray(body.statusEvents)) {
          return jsonResponse({ error: 'description and statusEvents are required' }, 400)
        }
        return jsonResponse(await draftEscalation(body.description, body.statusEvents))
      }
      default:
        return jsonResponse({ error: `Unknown action '${body.action}'` }, 400)
    }
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'AI request failed' }, 502)
  }
})