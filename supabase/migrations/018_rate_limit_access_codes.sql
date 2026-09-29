-- ============================================================
-- 018_rate_limit_access_codes.sql
-- Rate-limit failed validate-code attempts per IP.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.code_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip           text NOT NULL,
  code_tried   text,
  success      boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_attempts_ip_time
  ON public.code_attempts(ip, attempted_at DESC);

-- Cleanup function (called occasionally)
CREATE OR REPLACE FUNCTION public.cleanup_old_code_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.code_attempts
  WHERE attempted_at < now() - interval '24 hours';
$$;

-- RLS: no direct read/write from clients, only via service_role
ALTER TABLE public.code_attempts ENABLE ROW LEVEL SECURITY;
