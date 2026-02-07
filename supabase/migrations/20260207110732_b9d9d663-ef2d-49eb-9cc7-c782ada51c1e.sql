
-- 1) Extend referrals table with new columns + constraints
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referred_email text,
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rewarded_at timestamptz;

-- Add unique constraint on referred_user_id (one person can only be referred once)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referred_user_id_unique') THEN
    ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_user_id_unique UNIQUE (invited_user_id);
  END IF;
END $$;

-- Add unique constraint on (inviter, invited) if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referrals_inviter_invited_unique') THEN
    ALTER TABLE public.referrals ADD CONSTRAINT referrals_inviter_invited_unique UNIQUE (inviter_user_id, invited_user_id);
  END IF;
END $$;

-- Update status check to support new statuses
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('invited','signed_up','qualified','rewarded','invalid'));

-- 2) RLS for referred_email: only referrer can see it (already have SELECT policy for inviter)
-- No changes needed — existing policy "Users can view referrals they invited" covers it.

-- 3) Create qualify_referral_and_reward RPC
CREATE OR REPLACE FUNCTION public.qualify_referral_and_reward(p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_unrewarded_count int;
  v_batches int;
  v_i int;
BEGIN
  -- Get the referrer for this referred user
  SELECT inviter_user_id INTO v_referrer_id
  FROM public.referrals
  WHERE invited_user_id = p_referred_user_id
    AND status IN ('signed_up', 'confirmed')
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_REFERRAL_FOUND');
  END IF;

  -- Mark as qualified
  UPDATE public.referrals
  SET status = 'qualified', qualified_at = now()
  WHERE invited_user_id = p_referred_user_id
    AND status IN ('signed_up', 'confirmed');

  -- Count all qualified (unrewarded) referrals for this referrer
  SELECT COUNT(*) INTO v_unrewarded_count
  FROM public.referrals
  WHERE inviter_user_id = v_referrer_id
    AND status = 'qualified'
    AND rewarded_at IS NULL;

  -- For each batch of 5, award a credit
  v_batches := v_unrewarded_count / 5;

  FOR v_i IN 1..v_batches LOOP
    -- Mark 5 as rewarded
    UPDATE public.referrals
    SET status = 'rewarded', rewarded_at = now()
    WHERE id IN (
      SELECT id FROM public.referrals
      WHERE inviter_user_id = v_referrer_id
        AND status = 'qualified'
        AND rewarded_at IS NULL
      ORDER BY created_at
      LIMIT 5
    );

    -- Grant credit
    INSERT INTO public.mentor_credits (user_id, free_session_credits, updated_at)
    VALUES (v_referrer_id, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
      free_session_credits = mentor_credits.free_session_credits + 1,
      updated_at = now();

    -- Audit
    INSERT INTO public.entitlement_events (user_id, type, amount, meta)
    VALUES (v_referrer_id, 'referral_grant', 1, jsonb_build_object('batch', v_i));
  END LOOP;

  RETURN jsonb_build_object('success', true, 'rewarded_batches', v_batches);
END;
$$;

-- 4) Update apply_referral_on_signup to use new status flow + auto-qualify
CREATE OR REPLACE FUNCTION public.apply_referral_on_signup(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_user_id uuid;
  v_result jsonb;
BEGIN
  -- Find inviter by referral code
  SELECT user_id INTO v_inviter_user_id
  FROM public.profiles WHERE referral_code = invite_code;

  IF v_inviter_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
  END IF;

  -- Prevent self-referral
  IF v_inviter_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELF_REFERRAL');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invited_user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', true, 'message', 'ALREADY_REFERRED');
  END IF;

  -- Insert referral as signed_up (profile exists since they're calling this)
  INSERT INTO public.referrals (inviter_user_id, invited_user_id, status, confirmed_at)
  VALUES (v_inviter_user_id, auth.uid(), 'signed_up', now())
  ON CONFLICT (invited_user_id) DO NOTHING;

  -- Store referred_by_code on profile
  UPDATE public.profiles SET referred_by_code = invite_code WHERE user_id = auth.uid();

  -- Auto-qualify since profile exists
  SELECT public.qualify_referral_and_reward(auth.uid()) INTO v_result;

  RETURN jsonb_build_object('success', true, 'inviter_user_id', v_inviter_user_id);
END;
$$;
