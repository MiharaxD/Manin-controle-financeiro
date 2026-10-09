-- Optional background generation. Enable pg_cron in Supabase Database > Extensions first.
-- Run as postgres in SQL Editor. Never grant this routine to authenticated or anon.
select cron.schedule('manin-daily-recurrences', '15 6 * * *', $$select public.generate_all_recurring();$$);
