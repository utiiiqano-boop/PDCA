-- ============================================================
-- Notifications i18n
-- Adds i18n columns to the notifications table. Triggers and
-- notify-event can then translate per recipient's language.
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title_key    text,
  ADD COLUMN IF NOT EXISTS body_key     text,
  ADD COLUMN IF NOT EXISTS body_params  jsonb;

COMMENT ON COLUMN public.notifications.title_key   IS 'Optional i18n key, e.g. notif.actionCreated.title';
COMMENT ON COLUMN public.notifications.body_key    IS 'Optional i18n key, e.g. notif.actionCreated.body';
COMMENT ON COLUMN public.notifications.body_params IS 'Optional interpolation params for body_key';

-- Backfill: map existing FR titles to canonical keys (used by notify-event as fallback)
UPDATE public.notifications
SET title_key = CASE title
  WHEN 'Nouvelle action'   THEN 'actionCreated'
  WHEN 'Pilote modifié'    THEN 'pilotChanged'
  WHEN 'Échéance modifiée' THEN 'dueDateChanged'
  WHEN 'Phase modifiée'    THEN 'phaseChanged'
  WHEN 'Action clôturée'   THEN 'actionCompleted'
  WHEN 'Action annulée'    THEN 'actionCancelled'
  WHEN 'PDCA annulé'       THEN 'pdcaCancelled'
  ELSE NULL
END
WHERE title_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_title_key ON public.notifications(title_key) WHERE title_key IS NOT NULL;
