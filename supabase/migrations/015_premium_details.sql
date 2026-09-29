-- ============================================================
-- 015_premium_details.sql
-- RPC to fetch full subscription details + payment history.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_my_subscription_details()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id      uuid;
  v_company_id   uuid;
  v_company      public.companies%rowtype;
  v_now          timestamptz := now();
  v_days_left    int;
  v_pricing      jsonb;
  v_payments     jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select company_id into v_company_id
  from public.profiles
  where id = v_user_id;

  if v_company_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_company');
  end if;

  select * into v_company from public.companies where id = v_company_id;

  -- Days left
  if v_company.subscription_status = 'active' and v_company.subscription_ends_at > v_now then
    v_days_left := ceil(extract(epoch from (v_company.subscription_ends_at - v_now)) / 86400)::int;
  elsif v_company.trial_ends_at > v_now then
    v_days_left := ceil(extract(epoch from (v_company.trial_ends_at - v_now)) / 86400)::int;
  else
    v_days_left := 0;
  end if;

  -- Pricing grid (all plans / currencies, to show upgrade options)
  select coalesce(jsonb_agg(jsonb_build_object(
    'plan', p.plan,
    'currency', p.currency,
    'amount', p.amount,
    'months', p.months,
    'discount_pct', p.discount_pct
  ) order by p.sort_order, p.currency), '[]'::jsonb)
  into v_pricing
  from public.pricing p
  where p.active = true;

  -- Payment history
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', pay.id,
    'plan', pay.plan,
    'currency', pay.currency,
    'amount', pay.amount,
    'status', pay.status,
    'provider', pay.provider,
    'paid_at', pay.paid_at,
    'starts_at', pay.starts_at,
    'ends_at', pay.ends_at,
    'created_at', pay.created_at,
    'notes', pay.notes
  ) order by pay.created_at desc), '[]'::jsonb)
  into v_payments
  from public.payments pay
  where pay.company_id = v_company_id;

  return jsonb_build_object(
    'ok', true,
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'slug', v_company.slug,
      'created_at', v_company.created_at
    ),
    'subscription', jsonb_build_object(
      'status', v_company.subscription_status,
      'plan', v_company.subscription_plan,
      'currency', v_company.subscription_currency,
      'trial_started_at', v_company.trial_started_at,
      'trial_ends_at', v_company.trial_ends_at,
      'ends_at', v_company.subscription_ends_at,
      'days_left', v_days_left,
      'is_active', (v_company.subscription_status = 'active' and v_company.subscription_ends_at > v_now),
      'is_trial', (v_company.subscription_status = 'trial' and v_company.trial_ends_at > v_now)
    ),
    'pricing', v_pricing,
    'payments', v_payments
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_my_subscription_details() TO authenticated;
