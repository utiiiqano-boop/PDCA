-- ============================================================
-- 008_signup_company_join.sql
-- At signup: resolve the access_code's company, or create one.
-- SECURITY DEFINER → bypasses RLS for the linking steps.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_signup_resolve_company(
  p_access_code  text,
  p_company_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id    uuid;
  v_code_id    uuid;
  v_company_id uuid;
  v_created    boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  -- 1. If a code is provided, look it up
  if p_access_code is not null and length(trim(p_access_code)) > 0 then
    select id, company_id
      into v_code_id, v_company_id
    from public.access_codes
    where code = upper(trim(p_access_code))
      and status = 'active'
    limit 1;

    if v_code_id is null then
      return jsonb_build_object('ok', false, 'reason', 'invalid_code');
    end if;
  end if;

  -- 2. Create a company if we don't already have one
  if v_company_id is null then
    if p_company_name is null or length(trim(p_company_name)) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'company_name_required');
    end if;

    insert into public.companies (name)
    values (trim(p_company_name))
    returning id into v_company_id;

    v_created := true;

    -- Link the code to this new company
    if v_code_id is not null then
      update public.access_codes
      set company_id = v_company_id,
          status = 'used',
          used_at = now(),
          updated_at = now()
      where id = v_code_id;
    end if;
  end if;

  -- 3. Attach the profile to the company (only if not already attached)
  update public.profiles
  set company_id = v_company_id,
      updated_at = now()
  where id = v_user_id
    and (company_id is null or company_id = v_company_id);

  return jsonb_build_object(
    'ok', true,
    'company_id', v_company_id,
    'created', v_created,
    'joined_existing', not v_created
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_signup_resolve_company(text, text) TO authenticated;
