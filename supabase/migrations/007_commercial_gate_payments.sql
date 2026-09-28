-- ============================================================
-- 007_commercial_gate_payments.sql
-- Commercial gate + trial + subscriptions + multi-currency payments
-- ============================================================

-- ============================================================
-- 1. access_codes — codes de vente commerciale
-- ============================================================
CREATE TABLE IF NOT EXISTS public.access_codes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  customer_name       text NOT NULL,
  customer_email      text,
  customer_phone      text,
  company_id          uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','used','revoked')),
  notes               text,
  used_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code
  ON public.access_codes(code) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_access_codes_company
  ON public.access_codes(company_id);

-- ============================================================
-- 2. pricing — grille tarifaire multi-devises
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan        text NOT NULL CHECK (plan IN ('monthly','6month','yearly')),
  currency    text NOT NULL CHECK (currency IN ('USD','EUR','TND')),
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  months      int NOT NULL,
  discount_pct int NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan, currency)
);

-- ============================================================
-- 3. payments — historique transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan              text NOT NULL CHECK (plan IN ('monthly','6month','yearly')),
  currency          text NOT NULL CHECK (currency IN ('USD','EUR','TND')),
  amount            numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','failed','refunded')),
  provider          text NOT NULL
                      CHECK (provider IN ('manual_whatsapp','flouci','admin_manual')),
  provider_ref      text,
  proof_url         text,
  notes             text,
  paid_at           timestamptz,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_company
  ON public.payments(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status
  ON public.payments(status) WHERE status = 'pending';

-- ============================================================
-- 4. Extensions de la table companies
-- ============================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trial_started_at      timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at         timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status   text NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','cancelled','suspended')),
  ADD COLUMN IF NOT EXISTS subscription_plan     text
    CHECK (subscription_plan IS NULL OR subscription_plan IN ('monthly','6month','yearly')),
  ADD COLUMN IF NOT EXISTS subscription_currency text
    CHECK (subscription_currency IS NULL OR subscription_currency IN ('USD','EUR','TND')),
  ADD COLUMN IF NOT EXISTS subscription_ends_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_id       uuid;

CREATE INDEX IF NOT EXISTS idx_companies_subscription
  ON public.companies(subscription_status, subscription_ends_at);

-- ============================================================
-- 5. Function : démarrer le trial à la création de la company
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_company_start_trial()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if NEW.trial_started_at is null then
    NEW.trial_started_at := now();
  end if;
  if NEW.trial_ends_at is null then
    NEW.trial_ends_at := now() + interval '7 days';
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_company_start_trial ON public.companies;
CREATE TRIGGER trg_company_start_trial
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_company_start_trial();

-- ============================================================
-- 6. Backfill : companies existantes = trial 7j à partir de maintenant
-- ============================================================
UPDATE public.companies
SET trial_started_at = COALESCE(trial_started_at, now()),
    trial_ends_at    = COALESCE(trial_ends_at, now() + interval '7 days')
WHERE trial_started_at IS NULL;

-- ============================================================
-- 7. Function : statut d'abonnement effectif
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_company_access_status(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_company public.companies%rowtype;
  v_now     timestamptz := now();
  v_status  text;
  v_days_left int;
begin
  select * into v_company from public.companies where id = p_company_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'company_not_found');
  end if;

  -- Active subscription
  if v_company.subscription_status = 'active'
     and v_company.subscription_ends_at is not null
     and v_company.subscription_ends_at > v_now then
    return jsonb_build_object(
      'ok', true,
      'status', 'active',
      'plan', v_company.subscription_plan,
      'currency', v_company.subscription_currency,
      'ends_at', v_company.subscription_ends_at,
      'days_left', ceil(extract(epoch from (v_company.subscription_ends_at - v_now)) / 86400)::int
    );
  end if;

  -- Trial
  if v_company.trial_ends_at is not null and v_company.trial_ends_at > v_now then
    v_days_left := ceil(extract(epoch from (v_company.trial_ends_at - v_now)) / 86400)::int;
    return jsonb_build_object(
      'ok', true,
      'status', 'trial',
      'ends_at', v_company.trial_ends_at,
      'days_left', v_days_left,
      'warning', v_days_left <= 2
    );
  end if;

  -- Expired
  return jsonb_build_object(
    'ok', false,
    'status', 'expired',
    'reason', 'trial_or_subscription_expired'
  );
end;
$function$;

-- ============================================================
-- 8. RLS : deny-by-default, service_role only
-- ============================================================
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- pricing : lecture publique (pour afficher les tarifs dans le paywall)
DROP POLICY IF EXISTS pricing_read_all ON public.pricing;
CREATE POLICY pricing_read_all ON public.pricing
  FOR SELECT USING (active = true);

-- access_codes et payments : pas de policy = deny all sauf service_role (Edge Functions)
-- Les Edge Functions utilisent SUPABASE_SERVICE_ROLE_KEY, donc elles passent.

