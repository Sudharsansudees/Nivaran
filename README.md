# Nivaran

A grievance redressal platform: citizens file grievances, an AI step
classifies them to a department, an officer acts on them, and the
citizen has the final word on whether the issue is actually fixed. Every
status change goes through a single guarded state machine and is
recorded in an append-only audit trail.

**On the backend:** this was originally built as a real Supabase-backed
app — Postgres, row-level security, Edge Functions enforcing the state
machine server-side, email-OTP auth. That version is still in this repo
(`supabase/`) as a complete, working reference. It was switched to a
fully mocked, client-side backend for the actual submission after a
live Supabase platform incident on submission day made the real backend
unreliable to demo — this is an explicitly sanctioned option under this
hackathon's own rules ("mock the backend... it only needs to work for
judges, not real-world scale"). Everything else — every screen, the full
state machine, the audit trail, the AI classify/summarize/escalate
features — behaves identically; only where the data lives changed.

## Stack

- **Frontend:** Vite + React + React Router, plain CSS (civic-portal
  design system, IBM Plex Mono + Sans).
- **"Backend":** a mocked state machine + data store running entirely in
  the browser (`src/lib/mockApi.js`, `src/lib/mockAuth.js`), persisted to
  `localStorage`. No network calls, no external services, nothing that
  can go down mid-demo.
- **Hosting:** any static host (Vercel, Netlify, GitHub Pages) — see
  [DEPLOY.md](./DEPLOY.md).

## How the pieces fit together

- `src/lib/mockAuth.js` — instant sign-in. Citizens: type any email, done.
  Officers: seeded demo accounts or self-signup at `/officer/signup`.
- `src/lib/mockApi.js` — the same guarded state machine and transition
  table the original Edge Function used (see below), reimplemented to run
  client-side, plus small heuristic stand-ins for the AI features
  (keyword-based department classification, templated summaries/escalation
  drafts) so the app needs zero external API keys.
- `src/lib/api.js` — re-exports from `mockApi.js` so every page's imports
  stayed the same through the swap.
- `src/pages/` — the actual screens. Structurally unchanged from the
  Supabase-backed version; only the auth pages got simpler (no OTP/email
  round-trip needed for a mock).
- `supabase/` — the original real backend: schema, RLS policies, and the
  three Edge Functions (`transition-grievance`, `ai-assist`, `sla-timeout`).
  Kept as a reference for what a production version would look like;
  see `DEPLOY.md` in git history for how it was wired up, if useful.

## Local development

```bash
npm install
npm run dev
```

No `.env` file needed — there's nothing to configure.

## Grievance state machine

| From | Event | To | Guard |
|---|---|---|---|
| `filed` | `AI_CLASSIFIED` | `categorized` | classification result exists |
| `categorized` | `DEPT_PICKED_UP` | `in_progress` | caller is an officer in that department |
| `in_progress` | `DEPT_MARKED_DISPOSED` | `awaiting_confirmation` | caller is an officer; disposal type + remark provided |
| `in_progress` | `OFFICER_RETURNED_NOT_PERTAINING` | `categorized` | caller is an officer |
| `awaiting_confirmation` | `CITIZEN_CONFIRMED_FIXED` | `verified_closed` | caller is the owning citizen |
| `awaiting_confirmation` | `CITIZEN_SAID_NOT_FIXED` | `escalated` | caller is the owning citizen; `reopened_count += 1` |
| `escalated` | `REASSIGNED_SENIOR` | `in_progress` | caller is an officer |
| `awaiting_confirmation` | `SLA_TIMEOUT_NO_RESPONSE` | `escalated` | fired only by the scheduled cron (simulated via a manual demo trigger, not a real user action) |

Any request that doesn't match a row here is rejected and writes
nothing — enforced in `src/lib/mockApi.js`.
