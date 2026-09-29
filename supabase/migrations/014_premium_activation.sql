-- ============================================================
-- 014_premium_activation.sql
-- Premium page: admin activates a code → company becomes premium.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_activate_premium_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id        uuid;
  v_company_id     uuid;
  v_code_id        uuid;
  v_code_company   uuid;
  v_code_status    text;
  v_plan           text;
  v_currency       text;
  v_duration       int;
  v_current_ends   timestamptz;
  v_new_ends       timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  -- Admin only
  if not exists (
    select 1 from public.profiles
    where id = v_user_id and is_admin = true
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_admin');
  end if;

  -- Caller's company
  select company_id into v_company_id
  from public.profiles
  where id = v_user_id;

  if v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_company');
  end if;

  -- Find code
  select id, company_id, status, plan, currency, duration_days
    into v_code_id, v_code_company, v_code_status, v_plan, v_currency, v_duration
  from public.access_codes
  where code = upper(trim(p_code))
    and status in ('active', 'used')
  order by (status = 'active') desc
  limit 1;

  if v_code_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  -- Already used by another company
  if v_code_company is not null and v_code_company <> v_company_id then
    return jsonb_build_object('ok', false, 'reason', 'code_used_by_other');
  end if;

  -- Link the code to the caller's company (if not already)
  if v_code_company is null then
    update public.access_codes
    set company_id = v_company_id,
        status = 'used',
        used_at = now(),
        updated_at = now()
    where id = v_code_id;
  end if;

  -- Extend subscription (from current end or now)
  select subscription_ends_at into v_current_ends
  from public.companies where id = v_company_id;

  v_new_ends := greatest(coalesce(v_current_ends, now()), now())
                + (v_duration || ' days')::interval;

  update public.companies
  set subscription_status   = 'active',
      subscription_plan     = v_plan,
      subscription_currency = v_currency,
      subscription_ends_at  = v_new_ends
  where id = v_company_id;

  return jsonb_build_object(
    'ok', true,
    'plan', v_plan,
    'currency', v_currency,
    'duration_days', v_duration,
    'ends_at', v_new_ends
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_activate_premium_code(text) TO authenticated;
