-- ============================================================
-- 006_notify_reminders_cron.sql
-- Daily reminder push (J-3/J-2/J-1) at 08:00 UTC via pg_cron.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: unschedule any previous job with the same name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-reminders-daily') THEN
    PERFORM cron.unschedule('notify-reminders-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yzcfzhfnnsulndpoexdz.supabase.co/functions/v1/notify-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
