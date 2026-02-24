
-- =====================================================
-- Step 5: Enterprise Contract Mode — Schema
-- =====================================================

-- 1. Business entitlements table (contract-based)
CREATE TABLE public.business_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  plan_tier text NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  max_seats integer NOT NULL DEFAULT 1,
  seats_used integer NOT NULL DEFAULT 1,
  contract_start date,
  contract_end date,
  features jsonb NOT NULL DEFAULT '{"mentor_portal": false, "level3_challenges": false, "data_export": false, "premium_signals": false, "eligibility_gate": false, "decision_pack": false, "consistency_guard": false, "advanced_signals": false}'::jsonb,
  renewal_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

ALTER TABLE public.business_entitlements ENABLE ROW LEVEL SECURITY;

-- service_role writes, business owner reads own
CREATE POLICY "Service role full access" ON public.business_entitlements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Business reads own entitlements" ON public.business_entitlements
  FOR SELECT TO authenticated
  USING (business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin full access" ON public.business_entitlements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER trg_entitlements_updated_at
BEFORE UPDATE ON public.business_entitlements
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 2. Contact sales requests
CREATE TABLE public.contact_sales_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  company_name text,
  message text,
  desired_tier text,
  desired_seats integer,
  correlation_id text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_sales_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.contact_sales_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin reads all" ON public.contact_sales_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert own" ON public.contact_sales_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Admin RPC: set business plan (emits audit events via trigger)
CREATE OR REPLACE FUNCTION public.admin_set_business_plan(
  p_business_id uuid,
  p_plan_tier text,
  p_max_seats integer DEFAULT NULL,
  p_contract_start date DEFAULT NULL,
  p_contract_end date DEFAULT NULL,
  p_features jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_old_tier text;
  v_ent_id uuid;
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'ADMIN_REQUIRED');
  END IF;

  -- Get existing entitlement
  SELECT plan_tier, id INTO v_old_tier, v_ent_id
  FROM public.business_entitlements WHERE business_id = p_business_id;

  IF v_ent_id IS NULL THEN
    -- Create new
    INSERT INTO public.business_entitlements (
      business_id, plan_tier, max_seats, contract_start, contract_end, features, notes
    ) VALUES (
      p_business_id, p_plan_tier,
      COALESCE(p_max_seats, 1),
      p_contract_start, p_contract_end,
      COALESCE(p_features, '{"mentor_portal":false,"level3_challenges":false,"data_export":false,"premium_signals":false,"eligibility_gate":false,"decision_pack":false,"consistency_guard":false,"advanced_signals":false}'::jsonb),
      p_notes
    ) RETURNING id INTO v_ent_id;
  ELSE
    -- Update existing
    UPDATE public.business_entitlements SET
      plan_tier = p_plan_tier,
      max_seats = COALESCE(p_max_seats, max_seats),
      contract_start = COALESCE(p_contract_start, contract_start),
      contract_end = COALESCE(p_contract_end, contract_end),
      features = COALESCE(p_features, features),
      notes = COALESCE(p_notes, notes)
    WHERE business_id = p_business_id;
  END IF;

  -- Audit events
  PERFORM public.emit_audit_event(
    'system', auth.uid(), 'business.plan_changed', 'business_entitlements', v_ent_id::text,
    NULL, NULL,
    pg_catalog.jsonb_build_object(
      'business_id', p_business_id,
      'old_tier', v_old_tier,
      'new_tier', p_plan_tier,
      'max_seats', COALESCE(p_max_seats, 1)
    )
  );

  IF p_features IS NOT NULL THEN
    PERFORM public.emit_audit_event(
      'system', auth.uid(), 'business.entitlements_changed', 'business_entitlements', v_ent_id::text,
      NULL, NULL,
      pg_catalog.jsonb_build_object('business_id', p_business_id, 'features', p_features)
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object('success', true, 'entitlement_id', v_ent_id);
END;
$$;

-- 4. Server-side entitlement check function
CREATE OR REPLACE FUNCTION public.check_business_feature(p_business_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT COALESCE((features->>p_feature)::boolean, false)
  FROM public.business_entitlements
  WHERE business_id = p_business_id;
$$;

-- Create default starter entitlement for existing businesses
INSERT INTO public.business_entitlements (business_id, plan_tier, max_seats)
SELECT id, 'starter', 1 FROM public.business_profiles
ON CONFLICT (business_id) DO NOTHING;
