
-- ============================================
-- CREDIT LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.mentor_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  related_referral_id uuid NULL,
  related_session_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_credit_ledger_user_created
  ON public.mentor_credit_ledger (user_id, created_at DESC);

-- RLS
ALTER TABLE public.mentor_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ledger"
  ON public.mentor_credit_ledger FOR SELECT
  USING (user_id = auth.uid());

-- No direct inserts from client — only via SECURITY DEFINER RPCs

-- ============================================
-- RPC: get_my_credit_balance
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_credit_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(SUM(delta), 0)::integer
  FROM public.mentor_credit_ledger
  WHERE user_id = auth.uid();
$$;

-- ============================================
-- RPC: consume_my_credits_for_standard_session
-- ============================================
CREATE OR REPLACE FUNCTION public.consume_my_credits_for_standard_session(
  required_credits integer DEFAULT 5,
  p_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  -- Get current balance
  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM public.mentor_credit_ledger
  WHERE user_id = auth.uid();

  IF v_balance < required_credits THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS', 'balance', v_balance);
  END IF;

  -- Deduct
  INSERT INTO public.mentor_credit_ledger (user_id, delta, reason, related_session_id)
  VALUES (auth.uid(), -required_credits, 'session_45_consumed', p_session_id);

  v_new_balance := v_balance - required_credits;

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_balance);
END;
$$;

-- ============================================
-- UPDATE REFERRAL REWARD LOGIC: 1 referral = +1 credit (not 5=1)
-- ============================================
CREATE OR REPLACE FUNCTION public.qualify_referral_and_reward(p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_id uuid;
BEGIN
  -- Only qualify if referral exists and is in signed_up state
  SELECT inviter_user_id, id INTO v_referrer_id, v_referral_id
  FROM public.referrals
  WHERE invited_user_id = p_referred_user_id
    AND status = 'signed_up'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_PENDING_REFERRAL');
  END IF;

  -- Verify candidate actually completed a free intro session
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_sessions
    WHERE candidate_user_id = p_referred_user_id
      AND session_type = 'free_intro'
      AND status = 'completed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FREE_INTRO_NOT_COMPLETED');
  END IF;

  -- Mark as qualified
  UPDATE public.referrals
  SET status = 'qualified', qualified_at = now()
  WHERE invited_user_id = p_referred_user_id
    AND status = 'signed_up';

  -- Immediately grant +1 credit via ledger (idempotent: check if already granted for this referral)
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_credit_ledger
    WHERE related_referral_id = v_referral_id
      AND reason = 'referral_qualified'
  ) THEN
    INSERT INTO public.mentor_credit_ledger (user_id, delta, reason, related_referral_id)
    VALUES (v_referrer_id, 1, 'referral_qualified', v_referral_id);

    -- Also update legacy mentor_credits table for backward compat
    INSERT INTO public.mentor_credits (user_id, free_session_credits, updated_at)
    VALUES (v_referrer_id, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
      free_session_credits = mentor_credits.free_session_credits + 1,
      updated_at = now();

    -- Audit event
    INSERT INTO public.entitlement_events (user_id, type, amount, meta)
    VALUES (v_referrer_id, 'referral_grant', 1, jsonb_build_object('referral_id', v_referral_id));

    -- Mark referral as rewarded
    UPDATE public.referrals
    SET status = 'rewarded', rewarded_at = now()
    WHERE id = v_referral_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- UPDATE TRIGGER (keep existing, it calls qualify_referral_and_reward)
-- ============================================
-- The existing trg_qualify_referral_on_free_intro trigger already calls
-- qualify_referral_and_reward which we just updated above. No trigger changes needed.
