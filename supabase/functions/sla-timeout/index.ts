// Invoked on a schedule (see supabase/migrations/0002_cron.sql, which
// wires pg_cron + pg_net to call this daily). Finds every grievance
// stuck in awaiting_confirmation past its SLA with no citizen response,
// and fires SLA_TIMEOUT_NO_RESPONSE through the same guarded state
// machine transition-grievance uses for everything else — this function
// never touches grievances.status directly.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Only the pg_cron job (which knows CRON_SECRET) may trigger this.
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { data: overdue, error } = await admin
    .from('grievances_overdue_confirmation')
    .select('grievance_id')
  if (error) return jsonResponse({ error: error.message }, 500)

  const results = []
  for (const row of overdue ?? []) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/transition-grievance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
      body: JSON.stringify({
        grievanceId: row.grievance_id,
        event: 'SLA_TIMEOUT_NO_RESPONSE',
        payload: {},
      }),
    })
    results.push({ grievanceId: row.grievance_id, ok: res.ok })
  }

  return jsonResponse({ processed: results.length, results })
})