# Deploying Nivaran

Nivaran now runs entirely client-side — a mocked backend (see
`README.md` for why), no database, no server, no environment variables.
That makes deployment trivial: it's a static site.

## Push to GitHub

```bash
git init
git add .
git commit -m "Nivaran"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), import the GitHub repo.
2. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` — Vercel detects these automatically.
3. Deploy. No environment variables needed.

That's it — no Supabase project, no secrets, no cron jobs, nothing else
to configure. The live URL works immediately.

## Local development

```bash
npm install
npm run dev
```

## Demo credentials

- **Citizen:** any email address — sign-in is instant, no code/link
  needed.
- **Officer:** one seeded account per department, all with password
  `Nivaran#Demo1` (one-click buttons for these are also on `/officer/login`):
  - `roads.officer@nivaran.test` — Roads & Infrastructure
  - `water.officer@nivaran.test` — Water Supply
  - `electricity.officer@nivaran.test` — Electricity
  - `sanitation.officer@nivaran.test` — Sanitation & Waste
  - `health.officer@nivaran.test` — Public Health
  - `education.officer@nivaran.test` — Education
  - `police.officer@nivaran.test` — Police & Public Safety
  - `other.officer@nivaran.test` — Other

  Officers can also self-register at `/officer/signup` for any
  department.

## Note on data persistence

All data (accounts, grievances, audit trail) lives in the browser's
`localStorage`. That means:

- It's per-browser, not shared across devices or viewers — fine for a
  demo, since a judge trying it gets their own clean instance.
- Clearing site data / using a different browser starts fresh.
- If you want a guaranteed-consistent demo, file one or two grievances
  yourself right before recording your video, in the same browser
  profile you'll demo from.
