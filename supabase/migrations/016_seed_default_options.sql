-- ============================================================
-- 016_seed_default_options.sql
-- Auto-seed default options when a new company is created.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_seed_company_options(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Lignes
  insert into public.company_lines (company_id, label, sort_order, active)
  values
    (p_company_id, 'F01', 0, true),
    (p_company_id, 'F02', 1, true),
    (p_company_id, 'F03', 2, true),
    (p_company_id, 'F04', 3, true),
    (p_company_id, 'F05', 4, true),
    (p_company_id, 'F83', 5, true),
    (p_company_id, 'F86', 6, true),
    (p_company_id, 'F99', 7, true),
    (p_company_id, 'Autre', 8, true);

  -- Départements
  insert into public.company_departments (company_id, label, sort_order, active)
  values
    (p_company_id, 'Production', 0, true),
    (p_company_id, 'Qualité', 1, true),
    (p_company_id, 'Maintenance', 2, true),
    (p_company_id, 'Méthodes', 3, true),
    (p_company_id, 'Logistique', 4, true),
    (p_company_id, 'Achats', 5, true),
    (p_company_id, 'HSE', 6, true),
    (p_company_id, 'RH', 7, true),
    (p_company_id, 'Finance', 8, true),
    (p_company_id, 'Autre', 9, true);

  -- Pilotes
  insert into public.company_pilots (company_id, label, sort_order, active)
  values
    (p_company_id, 'Responsable Production', 0, true),
    (p_company_id, 'Responsable Qualité', 1, true),
    (p_company_id, 'Responsable Maintenance', 2, true),
    (p_company_id, 'Responsable HSE', 3, true),
    (p_company_id, 'Responsable Logistique', 4, true),
    (p_company_id, 'Responsable ACHAT', 5, true),
    (p_company_id, 'Responsable Méthodes', 6, true),
    (p_company_id, 'Responsable Finance', 7, true),
    (p_company_id, 'Autre', 8, true);

  -- Défauts
  insert into public.company_defect_types (company_id, label, sort_order, active)
  values
    (p_company_id, 'Défaut dimensionnel', 0, true),
    (p_company_id, 'Défaut surface', 1, true),
    (p_company_id, 'Défaut mécanique', 2, true),
    (p_company_id, 'Défaut documentaire', 3, true),
    (p_company_id, 'Défaut sécurité', 4, true),
    (p_company_id, 'Défaut équipement / machine', 5, true),
    (p_company_id, 'Défaut matières premières', 6, true),
    (p_company_id, 'Autre', 7, true);
end;
$function$;

-- Hook into rpc_signup_resolve_company: call seed after creating a company
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
  v_is_first    boolean := false;
  v_slug        text;
  v_base_slug   text;
  v_suffix      int := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

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

    if v_code_id is not null then
      update public.access_codes
      set company_id = v_company_id,
          status = 'used',
          used_at = now(),
          updated_at = now()
      where id = v_code_id;
    end if;
  end if;

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
    'is_admin', v_is_first
  );
end;
$function$;
