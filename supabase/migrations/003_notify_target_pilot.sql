-- ============================================================
-- 003_notify_target_pilot.sql
-- Route notifications to a specific pilot instead of the whole company.
-- ============================================================

-- 1. Add target_pilot_id column
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_pilot_id uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_target_pilot
  ON public.notifications(target_pilot_id)
  WHERE target_pilot_id IS NOT NULL;

-- 2. Refactor fn_emit_notification with target_pilot_id param
CREATE OR REPLACE FUNCTION public.fn_emit_notification(
  p_event_type       text,
  p_pdca_id          uuid,
  p_action_id        uuid,
  p_actor_id         uuid,
  p_title            text,
  p_body             text,
  p_target_pilot_id  uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  insert into public.notifications (
    event_type, pdca_id, action_id, actor_id, title, body, target_pilot_id
  )
  values (
    p_event_type, p_pdca_id, p_action_id, p_actor_id, p_title, p_body, p_target_pilot_id
  )
  returning id into v_id;

  perform net.http_post(
    url := 'https://yzcfzhfnnsulndpoexdz.supabase.co/functions/v1/notify-event',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notification_id', v_id)::jsonb
  );

  return v_id;
end $function$;

-- 3. Refactor fn_on_action_change — route to NEW.pilot_id
CREATE OR REPLACE FUNCTION public.fn_on_action_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_pdca public.pdca%rowtype;
  v_actor uuid;
  v_ref text;
  v_subject text;
begin
  begin
    v_actor := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  exception when others then
    v_actor := null;
  end;

  select * into v_pdca from public.pdca where id = coalesce(NEW.pdca_id, OLD.pdca_id);
  v_ref := coalesce(v_pdca.reference, 'PDCA');
  v_subject := coalesce(v_pdca.subject, '');

  if TG_OP = 'INSERT' then
    perform public.fn_emit_notification(
      'ACTION_CREATED', NEW.pdca_id, NEW.id, v_actor,
      'Nouvelle action',
      v_ref || ' — ' || NEW.action || ' (Pilote : ' || coalesce(NEW.pilot_name, '—') || ')',
      NEW.pilot_id
    );
    return NEW;
  end if;

  if OLD.pilot_name is distinct from NEW.pilot_name then
    perform public.fn_emit_notification(
      'PILOT_CHANGED', NEW.pdca_id, NEW.id, v_actor,
      'Action réassignée',
      'Une action vous a été réassignée : ' || NEW.action,
      NEW.pilot_id
    );
  end if;

  if OLD.due_date is distinct from NEW.due_date then
    perform public.fn_emit_notification(
      'DUE_DATE_CHANGED', NEW.pdca_id, NEW.id, v_actor,
      'Échéance modifiée',
      v_ref || ' — ' || NEW.action || ' : ' ||
      coalesce(to_char(OLD.due_date, 'DD/MM/YYYY'), '—') || ' → ' ||
      coalesce(to_char(NEW.due_date, 'DD/MM/YYYY'), '—'),
      NEW.pilot_id
    );
  end if;

  if OLD.phase is distinct from NEW.phase then
    perform public.fn_emit_notification(
      'PHASE_CHANGED', NEW.pdca_id, NEW.id, v_actor,
      'Phase modifiée',
      v_ref || ' — ' || NEW.action || ' : ' || OLD.phase || ' → ' || NEW.phase,
      NEW.pilot_id
    );
  end if;

  if OLD.status is distinct from NEW.status then
    if NEW.status = 'COMPLETED' then
      perform public.fn_emit_notification(
        'ACTION_COMPLETED', NEW.pdca_id, NEW.id, v_actor,
        'Action clôturée',
        v_ref || ' — ' || NEW.action,
        NEW.pilot_id
      );
    elsif NEW.status = 'CANCELLED' then
      perform public.fn_emit_notification(
        'ACTION_CANCELLED', NEW.pdca_id, NEW.id, v_actor,
        'Action annulée',
        v_ref || ' — ' || NEW.action,
        NEW.pilot_id
      );
    end if;
  end if;

  return NEW;
end $function$;

-- 4. Refactor fn_on_pdca_change — no target (company-wide)
CREATE OR REPLACE FUNCTION public.fn_on_pdca_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_actor uuid;
begin
  begin
    v_actor := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  exception when others then
    v_actor := null;
  end;

  if TG_OP = 'UPDATE' then
    if OLD.status is distinct from NEW.status and NEW.status = 'CANCELLED' then
      perform public.fn_emit_notification(
        'PDCA_CANCELLED', NEW.id, null, v_actor,
        'PDCA annulé',
        NEW.reference || ' — ' || NEW.subject,
        null
      );
    end if;
  end if;

  return NEW;
end $function$;
