-- ============================================================
-- 019_notifications_in_app.sql
-- In-app notification center: per-user read tracking + RPCs.
-- ============================================================

-- 1. Per-user read tracking
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user
  ON public.notification_reads(user_id, read_at DESC);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- 2. Helper: notifications visible to the current user
--    Visible if (target_pilot_id = me) OR (target_pilot_id is null AND same company)
CREATE OR REPLACE FUNCTION public.rpc_my_notifications(
  p_limit  int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id    uuid;
  v_company_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select company_id into v_company_id from public.profiles where id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'event_type', n.event_type,
        'title', n.title,
        'body', n.body,
        'pdca_id', n.pdca_id,
        'action_id', n.action_id,
        'created_at', n.created_at,
        'is_read', (nr.read_at is not null),
        'read_at', nr.read_at
      ) order by n.created_at desc)
      from public.notifications n
      left join public.notification_reads nr
        on nr.notification_id = n.id and nr.user_id = v_user_id
      where (
        n.target_pilot_id = v_user_id
        or (n.target_pilot_id is null and n.company_id = v_company_id)
      )
      limit greatest(p_limit, 1) offset greatest(p_offset, 0)
    ), '[]'::jsonb)
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_my_notifications(int, int) TO authenticated;

-- 3. Unread count
CREATE OR REPLACE FUNCTION public.rpc_unread_notification_count()
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id    uuid;
  v_company_id uuid;
  v_count      int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then return 0; end if;

  select company_id into v_company_id from public.profiles where id = v_user_id;
  if v_company_id is null then return 0; end if;

  select count(*) into v_count
  from public.notifications n
  left join public.notification_reads nr
    on nr.notification_id = n.id and nr.user_id = v_user_id
  where nr.read_at is null
    and (
      n.target_pilot_id = v_user_id
      or (n.target_pilot_id is null and n.company_id = v_company_id)
    );

  return coalesce(v_count, 0);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_unread_notification_count() TO authenticated;

-- 4. Mark one as read
CREATE OR REPLACE FUNCTION public.rpc_mark_notification_read(p_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  insert into public.notification_reads (notification_id, user_id)
  values (p_notification_id, v_user_id)
  on conflict (notification_id, user_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_mark_notification_read(uuid) TO authenticated;

-- 5. Mark all as read
CREATE OR REPLACE FUNCTION public.rpc_mark_all_notifications_read()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id    uuid;
  v_company_id uuid;
  v_count      int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select company_id into v_company_id from public.profiles where id = v_user_id;
  if v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_company');
  end if;

  insert into public.notification_reads (notification_id, user_id)
  select n.id, v_user_id
  from public.notifications n
  where (
    n.target_pilot_id = v_user_id
    or (n.target_pilot_id is null and n.company_id = v_company_id)
  )
  on conflict (notification_id, user_id) do nothing;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'marked', v_count);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_mark_all_notifications_read() TO authenticated;
