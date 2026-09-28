-- ============================================================
-- 010_fix_rpc_code_validation.sql
-- Fix: only reject 'used' codes without a company, not 'active' ones.
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
  v_user_id     uuid;
  v_code_id     uuid;
  v_code_status text;
  v_company_id  uuid;
  v_created     boolean := false;
  v_slug        text;
  v_base_slug   text;
  v_suffix      int := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  -- 1. Look up the code (accept 'active' AND 'used')
  if p_access_code is not null and length(trim(p_access_code)) > 0 then
    select id, company_id, status
      into v_code_id, v_company_id, v_code_status
    from public.access_codes
    where code = upper(trim(p_access_code))
      and status in ('active', 'used')
    order by (status = 'active') desc
    limit 1;

    if v_code_id is null then
      return jsonb_build_object('ok', false, 'reason', 'invalid_code');
    end if;
  end if;

  -- 2. ONLY 'used' codes must already have a company
  if v_code_status = 'used' and v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'code_without_company');
  end if;

  -- 3. Create company if we still don't have one (first signup path)
  if v_company_id is null then
    if p_company_name is null or length(trim(p_company_name)) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'company_name_required');
    end if;

    -- Build unique slug
    v_base_slug := lower(regexp_replace(trim(p_company_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    if length(v_base_slug) = 0 then
      v_base_slug := 'company';
    end if;
    v_base_slug := left(v_base_slug, 40);

    v_slug := v_base_slug;
    while exists (select 1 from public.companies where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix;
    end loop;

    insert into public.companies (name, slug, created_by)
    values (trim(p_company_name), v_slug, v_user_id)
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

  -- 4. Attach the profile to the company
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
