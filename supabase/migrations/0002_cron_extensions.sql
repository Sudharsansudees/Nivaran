-- Enables the extensions needed to schedule the SLA-timeout check.
-- The actual cron.schedule(...) call is NOT here on purpose: it needs
-- your project's function URL and CRON_SECRET, which are
-- deployment-specific and shouldn't be committed to a migration file.
-- Run it once from the Supabase SQL editor after deploying — see
-- DEPLOY.md step 5.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;