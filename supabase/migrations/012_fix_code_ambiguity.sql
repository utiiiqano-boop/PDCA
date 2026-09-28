-- ============================================================
-- 012_fix_code_ambiguity.sql
-- Fix: qualify column references to avoid PL/pgSQL variable collision.
-- ============================================================

-- 1. Drop the old functions (signature changes)
DROP FUNCTION IF EXISTS public.create_access_code(text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.create_access_code_renewal(text,text,text,text);

-- 2. Rewrite create_access_code with qualified columns
CREATE OR REPLACE FUNCTION public.create_access_code(
  p_plan           text,
  p_currency       text,
  p_customer_name  text,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_notes          text DEFAULT NULL
)
RETURNS TABLE(
  out_code         text,
  out_customer     text,
  out_plan         text,
  out_duration     int
)
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
  if p_plan not in ('trial','monthly','6month','yearly') then
    raise exception 'Invalid plan: %', p_plan;
  end if;

  if p_plan <> 'trial' and (p_currency is null or p_currency not in ('TND','EUR','USD')) then
    raise exception 'Currency required for plan % (TND/EUR/USD)', p_plan;
  end if;

  v_duration := case p_plan
    when 'trial'   then 7
    when 'monthly' then 30
    when '6month'  then 180
    when 'yearly'  then 365
  end;

  v_prefix := _code_prefix(p_plan);

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'Could not generate unique code after 20 attempts';
    end if;
    v_random := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    v_code   := 'PDCA-' || v_prefix || '-' || v_random;
    exit when not exists (
      select 1 from public.access_codes ac where ac.code = v_code
    );
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

  out_code     := v_code;
  out_customer := p_customer_name;
  out_plan     := p_plan;
  out_duration := v_duration;
  return next;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.create_access_code(text,text,text,text,text,text) TO authenticated;

-- 3. Rewrite create_access_code_renewal
CREATE OR REPLACE FUNCTION public.create_access_code_renewal(
  p_plan         text,
  p_currency     text,
  p_company_name text,
  p_notes        text DEFAULT NULL
)
RETURNS TABLE(
  out_code         text,
  out_company      text,
  out_plan         text,
  out_duration     int
)
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

  select c.id, c.name into v_company_id, v_customer
  from public.companies c
  where c.name = p_company_name
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
    exit when not exists (
      select 1 from public.access_codes ac where ac.code = v_code
    );
  end loop;

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

  update public.companies
  set subscription_status   = 'active',
      subscription_plan     = p_plan,
      subscription_currency = p_currency,
      subscription_ends_at  = greatest(
        coalesce(subscription_ends_at, now()),
        now()
      ) + (v_duration || ' days')::interval
  where id = v_company_id;

  out_code     := v_code;
  out_company  := p_company_name;
  out_plan     := p_plan;
  out_duration := v_duration;
  return next;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.create_access_code_renewal(text,text,text,text) TO authenticated;
