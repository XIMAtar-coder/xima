
-- STEP 1: Remove auto-qualification from apply_referral_on_signup
CREATE OR REPLACE FUNCTION public.apply_referral_on_signup(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_user_id uuid;
BEGIN
  SELECT user_id INTO v_inviter_user_id
  FROM public.profiles WHERE referral_code = invite_code;

  IF v_inviter_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
  END IF;

  IF v_inviter_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELF_REFERRAL');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE invited_user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', true, 'message', 'ALREADY_REFERRED');
  END IF;

  -- Only create signed_up referral — NO qualification
  INSERT INTO public.referrals (inviter_user_id, invited_user_id, status)
  VALUES (v_inviter_user_id, auth.uid(), 'signed_up')
  ON CONFLICT (invited_user_id) DO NOTHING;

  UPDATE public.profiles SET referred_by_code = invite_code WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'inviter_user_id', v_inviter_user_id);
END;
$$;

-- STEP 2: Update qualify_referral_and_reward to accept session validation
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
  -- Only qualify if referral exists and is in signed_up state
  SELECT inviter_user_id INTO v_referrer_id
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

  -- Mark as qualified (idempotent — only signed_up rows)
  UPDATE public.referrals
  SET status = 'qualified', qualified_at = now()
  WHERE invited_user_id = p_referred_user_id
    AND status = 'signed_up';

  -- Count all qualified unrewarded referrals for this referrer
  SELECT COUNT(*) INTO v_unrewarded_count
  FROM public.referrals
  WHERE inviter_user_id = v_referrer_id
    AND status = 'qualified'
    AND rewarded_at IS NULL;

  v_batches := v_unrewarded_count / 5;

  FOR v_i IN 1..v_batches LOOP
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

    INSERT INTO public.mentor_credits (user_id, free_session_credits, updated_at)
    VALUES (v_referrer_id, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
      free_session_credits = mentor_credits.free_session_credits + 1,
      updated_at = now();

    INSERT INTO public.entitlement_events (user_id, type, amount, meta)
    VALUES (v_referrer_id, 'referral_grant', 1, jsonb_build_object('batch', v_i));
  END LOOP;

  RETURN jsonb_build_object('success', true, 'rewarded_batches', COALESCE(v_batches, 0));
END;
$$;

-- STEP 3: Trigger on mentor_sessions to auto-qualify referral on free intro completion
CREATE OR REPLACE FUNCTION public.trg_qualify_referral_on_free_intro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_by text;
  v_result jsonb;
BEGIN
  -- Only fire when status becomes 'completed' on a free_intro session
  IF NEW.status = 'completed'
     AND NEW.session_type = 'free_intro'
     AND (OLD.status IS DISTINCT FROM 'completed')
  THEN
    -- Check if this candidate was referred
    SELECT referred_by_code INTO v_referred_by
    FROM public.profiles
    WHERE user_id = NEW.candidate_user_id;

    IF v_referred_by IS NOT NULL THEN
      PERFORM public.qualify_referral_and_reward(NEW.candidate_user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (idempotent)
DROP TRIGGER IF EXISTS trg_qualify_referral_on_free_intro ON public.mentor_sessions;
CREATE TRIGGER trg_qualify_referral_on_free_intro
  AFTER UPDATE ON public.mentor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_qualify_referral_on_free_intro();
