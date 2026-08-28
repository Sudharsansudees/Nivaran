// Creates a handful of real officer accounts (auth user + profiles row)
// using the service-role key. Run this once, locally, after your
// Supabase project exists. Never runs in the browser, never gets
// deployed — it's an operator script, not app code.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node supabase/seed/seedOfficers.mjs
//
// Edit the OFFICERS list below first, or set OFFICER_PASSWORD to override
// the shared demo password.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = process.env.OFFICER_PASSWORD ?? 'Nivaran#Demo1'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.')
  process.exit(1)
}

const OFFICERS = [
  { email: 'roads.officer@nivaran.test', name: 'Roads & Infrastructure Officer', department: 'Roads & Infrastructure' },
  { email: 'water.officer@nivaran.test', name: 'Water Supply Officer', department: 'Water Supply' },
  { email: 'sanitation.officer@nivaran.test', name: 'Sanitation & Waste Officer', department: 'Sanitation & Waste' },
]

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

for (const officer of OFFICERS) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: officer.email,
    password: PASSWORD,
    email_confirm: true,
  })

  if (createError) {
    console.error(`✗ ${officer.email}: ${createError.message}`)
    continue
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'officer',
    name: officer.name,
    department: officer.department,
  })

  if (profileError) {
    console.error(`✗ ${officer.email} (profile insert failed): ${profileError.message}`)
    continue
  }

  console.log(`✓ ${officer.email} / ${PASSWORD} — ${officer.department}`)
}
