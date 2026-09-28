-- ============================================================
-- 005_fix_pilot_resolution_token.sql
-- Fix: don't require expo_push_token in the trigger's profile
-- resolution. The trigger just marks target_pilot_id; notify-event
-- filters by token presence.
-- ============================================================

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
  v_target_profile_id uuid;
begin
  begin
    v_actor := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  exception when others then
    v_actor := null;
  end;

  select * into v_pdca from public.pdca where id = coalesce(NEW.pdca_id, OLD.pdca_id);
  v_ref := coalesce(v_pdca.reference, 'PDCA');
  v_subject := coalesce(v_pdca.subject, '');

  -- Resolve profiles.id from the pilot's NAME within the same company.
  -- Note: do NOT require a push token here — notify-event handles that.
  if NEW.pilot_name is not null and NEW.company_id is not null then
    select p.id into v_target_profile_id
    from public.profiles p
    where p.company_id = NEW.company_id
      and (p.full_name = NEW.pilot_name or p.role = NEW.pilot_name)
    order by (p.full_name = NEW.pilot_name) desc
    limit 1;
  end if;

  if TG_OP = 'INSERT' then
    perform public.fn_emit_notification(
      'ACTION_CREATED', NEW.pdca_id, NEW.id, v_actor,
      'Nouvelle action',
      v_ref || ' — ' || NEW.action || ' (Pilote : ' || coalesce(NEW.pilot_name, '—') || ')',
      v_target_profile_id
    );
    return NEW;
  end if;

  if OLD.pilot_name is distinct from NEW.pilot_name then
    perform public.fn_emit_notification(
      'PILOT_CHANGED', NEW.pdca_id, NEW.id, v_actor,
      'Action réassignée',
      'Une action vous a été réassignée : ' || NEW.action,
      v_target_profile_id
    );
  end if;

  if OLD.due_date is distinct from NEW.due_date then
    perform public.fn_emit_notification(
      'DUE_DATE_CHANGED', NEW.pdca_id, NEW.id, v_actor,
      'Échéance modifiée',
      v_ref || ' — ' || NEW.action || ' : ' ||
      coalesce(to_char(OLD.due_date, 'DD/MM/YYYY'), '—') || ' → ' ||
      coalesce(to_char(NEW.due_date, 'DD/MM/YYYY'), '—'),
      v_target_profile_id
    );
  end if;

  if OLD.phase is distinct from NEW.phase then
    perform public.fn_emit_notification(
      'PHASE_CHANGED', NEW.pdca_id, NEW.id, v_actor,
      'Phase modifiée',
      v_ref || ' — ' || NEW.action || ' : ' || OLD.phase || ' → ' || NEW.phase,
      v_target_profile_id
    );
  end if;

  if OLD.status is distinct from NEW.status then
    if NEW.status = 'COMPLETED' then
      perform public.fn_emit_notification(
        'ACTION_COMPLETED', NEW.pdca_id, NEW.id, v_actor,
        'Action clôturée',
        v_ref || ' — ' || NEW.action,
        v_target_profile_id
      );
    elsif NEW.status = 'CANCELLED' then
      perform public.fn_emit_notification(
        'ACTION_CANCELLED', NEW.pdca_id, NEW.id, v_actor,
        'Action annulée',
        v_ref || ' — ' || NEW.action,
        v_target_profile_id
      );
    end if;
  end if;

  return NEW;
end $function$;
