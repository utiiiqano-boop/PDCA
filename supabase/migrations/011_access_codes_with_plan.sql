-- ============================================================
-- 011_access_codes_with_plan.sql
-- Extend access_codes with plan/currency/duration + helper functions.
-- Signup: premium code → active subscription, trial code → 7d trial.
-- ============================================================

-- 1. Extend access_codes
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial','monthly','6month','yearly')),
  ADD COLUMN IF NOT EXISTS currency text
    CHECK (currency IS NULL OR currency IN ('TND','EUR','USD')),
  ADD COLUMN IF NOT EXISTS duration_days int NOT NULL DEFAULT 7;

-- 2. Helper: prefix per plan
CREATE OR REPLACE FUNCTION public._code_prefix(p_plan text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'trial'   THEN 'TR'
    WHEN 'monthly' THEN 'MO'
    WHEN '6month'  THEN '6M'
    WHEN 'yearly'  THEN 'YR'
    ELSE 'XX'
  END;
$$;

-- 3. Function: create_access_code
CREATE OR REPLACE FUNCTION public.create_access_code(
  p_plan          text,
  p_currency      text,
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_notes         text DEFAULT NULL
)
RETURNS TABLE(code text, customer_name text, plan text, duration_days int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_prefix   text;
  v_random   text;
  v_code     text;
  v_duration int;
  v_attempt  int := 0;
begin
  -- Validate plan
  if p_plan not in ('trial','monthly','6month','yearly') then
    raise exception 'Invalid plan: %', p_plan;
  end if;

  -- Currency: null for trial, required otherwise
  if p_plan <> 'trial' and (p_currency is null or p_currency not in ('TND','EUR','USD')) then
    raise exception 'Currency required for plan % (TND/EUR/USD)', p_plan;
  end if;

  -- Duration
  v_duration := case p_plan
    when 'trial'   then 7
    when 'monthly' then 30
    when '6month'  then 180
    when 'yearly'  then 365
  end;

  v_prefix := _code_prefix(p_plan);

  -- Generate unique code
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'Could not generate unique code after 20 attempts';
    end if;
    v_random := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    v_code   := 'PDCA-' || v_prefix || '-' || v_random;
    exit when not exists (select 1 from public.access_codes where code = v_code);
  end loop;

  insert into public.access_codes (
    code, customer_name, customer_email, customer_phone,
    plan, currency, duration_days, notes, status
  ) values (
    v_code,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_plan,
    p_currency,
    v_duration,
    p_notes,
    'active'
  );

  return query select v_code, p_customer_name, p_plan, v_duration;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.create_access_code(text,text,text,text,text,text) TO authenticated;

-- 4. Function: renewal code bound to an existing company
CREATE OR REPLACE FUNCTION public.create_access_code_renewal(
  p_plan         text,
  p_currency     text,
  p_company_name text,
  p_notes        text DEFAULT NULL
)
RETURNS TABLE(code text, company_name text, plan text, duration_days int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_customer   text;
  v_prefix     text;
  v_random     text;
  v_code       text;
  v_duration   int;
  v_attempt    int := 0;
begin
  if p_plan not in ('monthly','6month','yearly') then
    raise exception 'Renewal plan must be monthly/6month/yearly';
  end if;

  select id, name into v_company_id, v_customer
  from public.companies
  where name = p_company_name
  limit 1;

  if v_company_id is null then
    raise exception 'Company not found: %', p_company_name;
  end if;

  v_duration := case p_plan
    when 'monthly' then 30
    when '6month'  then 180
    when 'yearly'  then 365
  end;

  v_prefix := 'RN-' || _code_prefix(p_plan);

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'Could not generate unique code';
    end if;
    v_random := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    v_code   := 'PDCA-' || v_prefix || '-' || v_random;
    exit when not exists (select 1 from public.access_codes where code = v_code);
  end loop;

  -- Pre-link to the company so signup joins it
  insert into public.access_codes (
    code, customer_name, company_id,
    plan, currency, duration_days, notes, status, used_at
  ) values (
    v_code,
    v_customer,
    v_company_id,
    p_plan, p_currency, v_duration,
    coalesce(p_notes, 'Renouvellement'),
    'used',
    now()
  );

  -- Extend the company immediately (admin renewal path)
  update public.companies
  set subscription_status   = 'active',
      subscription_plan     = p_plan,
      subscription_currency = p_currency,
      subscription_ends_at  = greatest(
        coalesce(subscription_ends_at, now()),
        now()
      ) + (v_duration || ' days')::interval
  where id = v_company_id;

  return query select v_code, p_company_name, p_plan, v_duration;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.create_access_code_renewal(text,text,text,text) TO authenticated;

-- 5. Update rpc_signup_resolve_company to honor plan
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
  v_plan        text;
  v_currency    text;
  v_duration    int;
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

  -- Look up the code
  if p_access_code is not null and length(trim(p_access_code)) > 0 then
    select id, company_id, status, plan, currency, duration_days
      into v_code_id, v_company_id, v_code_status, v_plan, v_currency, v_duration
    from public.access_codes
    where code = upper(trim(p_access_code))
      and status in ('active', 'used')
    order by (status = 'active') desc
    limit 1;

    if v_code_id is null then
      return jsonb_build_object('ok', false, 'reason', 'invalid_code');
    end if;
  end if;

  if v_code_status = 'used' and v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'code_without_company');
  end if;

  -- Create company if first signup
  if v_company_id is null then
    if p_company_name is null or length(trim(p_company_name)) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'company_name_required');
    end if;

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

    -- Insert company with subscription based on code plan
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

    -- Link the code
    if v_code_id is not null then
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
