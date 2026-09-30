-- ============================================================
-- 020_access_codes_modes.sql
-- Add 'mode' to access_codes:
--   - signup  : every signup creates a NEW company (demo/public)
--   - company : 1st creates, others join (client paying)
--   - invite  : forces join of an existing company (invite link)
-- Also: RPC for admins to generate invite codes.
-- ============================================================

-- 1. Add mode column
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'company'
    CHECK (mode IN ('signup', 'company', 'invite'));

-- 2. RPC: resolve / create / join company, honoring the mode
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
  v_code_mode   text;
  v_plan        text;
  v_currency    text;
  v_duration    int;
  v_company_id  uuid;
  v_created     boolean := false;
  v_is_first    boolean := false;
  v_slug        text;
  v_base_slug   text;
  v_suffix      int := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  -- Look up the code
  if p_access_code is not null and length(trim(p_access_code)) > 0 then
    select id, company_id, status, mode, plan, currency, duration_days
      into v_code_id, v_company_id, v_code_status, v_code_mode, v_plan, v_currency, v_duration
    from public.access_codes
    where code = upper(trim(p_access_code))
      and status in ('active', 'used')
    order by (status = 'active') desc
    limit 1;

    if v_code_id is null then
      return jsonb_build_object('ok', false, 'reason', 'invalid_code');
    end if;
  end if;

  -- MODE 'signup' : ignore existing company_id, always create new
  if v_code_mode = 'signup' then
    v_company_id := null;
  end if;

  -- MODE 'invite' : code must already have a company
  if v_code_mode = 'invite' and v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invite_without_company');
  end if;

  -- MODE 'company' : if used without company → error
  if v_code_mode = 'company' and v_code_status = 'used' and v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'code_without_company');
  end if;

  -- Create company if we still don't have one
  if v_company_id is null then
    if p_company_name is null or length(trim(p_company_name)) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'company_name_required');
    end if;

    v_base_slug := lower(regexp_replace(trim(p_company_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    if length(v_base_slug) = 0 then v_base_slug := 'company'; end if;
    v_base_slug := left(v_base_slug, 40);

    v_slug := v_base_slug;
    while exists (select 1 from public.companies where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix;
    end loop;

    insert into public.companies (
      name, slug, created_by,
      subscription_status, subscription_plan, subscription_currency,
      trial_started_at, trial_ends_at, subscription_ends_at
    ) values (
      trim(p_company_name), v_slug, v_user_id,
      case when v_plan = 'trial' or v_plan is null then 'trial' else 'active' end,
      case when v_plan is null or v_plan = 'trial' then null else v_plan end,
      case when v_plan is null or v_plan = 'trial' then null else v_currency end,
      now(),
      case when v_plan is null or v_plan = 'trial' then now() + interval '7 days' else null end,
      case when v_plan is null or v_plan = 'trial' then null
           else now() + (coalesce(v_duration, 30) || ' days')::interval end
    )
    returning id into v_company_id;

    v_created := true;
    v_is_first := true;

    -- Seed default options
    perform public.fn_seed_company_options(v_company_id);

    -- Link the code only if it's a company-mode code
    if v_code_id is not null and v_code_mode = 'company' then
      update public.access_codes
      set company_id = v_company_id,
          status = 'used',
          used_at = now(),
          updated_at = now()
      where id = v_code_id;
    end if;
  end if;

  -- Attach profile
  update public.profiles
  set company_id = v_company_id,
      is_admin   = case when v_is_first then true else is_admin end,
      updated_at = now()
  where id = v_user_id
    and (company_id is null or company_id = v_company_id);

  return jsonb_build_object(
    'ok', true,
    'company_id', v_company_id,
    'created', v_created,
    'joined_existing', not v_created,
    'is_admin', v_is_first,
    'mode', v_code_mode
  );
end;
$function$;

-- 3. RPC: admin creates an invite code for their own company
CREATE OR REPLACE FUNCTION public.rpc_create_company_invite()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id    uuid;
  v_company_id uuid;
  v_is_admin   boolean;
  v_code       text;
  v_random     text;
  v_attempt    int := 0;
  v_company_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select company_id, is_admin into v_company_id, v_is_admin
  from public.profiles where id = v_user_id;

  if not v_is_admin then
    return jsonb_build_object('ok', false, 'reason', 'not_admin');
  end if;
  if v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_company');
  end if;

  select name into v_company_name from public.companies where id = v_company_id;

  -- Generate unique invite code
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      return jsonb_build_object('ok', false, 'reason', 'could_not_generate');
    end if;
    v_random := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    v_code   := 'PDCA-INV-' || v_random;
    exit when not exists (select 1 from public.access_codes where code = v_code);
  end loop;

  insert into public.access_codes (
    code, customer_name, company_id, mode, plan, status, notes
  ) values (
    v_code, v_company_name, v_company_id, 'invite', 'trial', 'active',
    'Invitation created by admin'
  );

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'company_name', v_company_name
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_create_company_invite() TO authenticated;

-- 4. Set demo code to 'signup' mode
UPDATE public.access_codes
SET mode = 'signup'
WHERE code = 'PDCA-TEST-001';

-- 5. Any existing 'used' codes without company → leave as-is (admin can clean up)
SELECT code, mode, status FROM public.access_codes ORDER BY created_at DESC;
