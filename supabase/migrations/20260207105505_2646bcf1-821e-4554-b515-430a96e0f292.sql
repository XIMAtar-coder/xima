
-- =============================================
-- PART A: Update free intro duration 15 → 30
-- =============================================

-- A1. Change default on mentor_sessions.duration_minutes from 15 to 30
ALTER TABLE public.mentor_sessions 
ALTER COLUMN duration_minutes SET DEFAULT 30;

-- A2. Update the RPC to create sessions with duration_minutes=30
CREATE OR REPLACE FUNCTION public.request_free_intro_session(p_slot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_candidate_profile_id uuid;
  v_selected_mentor_id uuid;
  v_slot record;
  v_session_id uuid;
  v_existing_free_intro timestamptz;
BEGIN
  -- Get candidate profile
  SELECT id, free_intro_session_used_at INTO v_candidate_profile_id, v_existing_free_intro
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF v_candidate_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Profile not found');
  END IF;
  
  -- Check if free intro already used
  IF v_existing_free_intro IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'FREE_INTRO_ALREADY_USED', 'message', 'You have already used your free intro session');
  END IF;
  
  -- Resolve selected mentor from mentor_matches (most recent)
  v_selected_mentor_id := public.candidate_selected_mentor_id(auth.uid());
  
  IF v_selected_mentor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_MENTOR_SELECTED', 'message', 'No mentor selected');
  END IF;
  
  -- Get and lock the slot
  SELECT * INTO v_slot 
  FROM public.mentor_availability_slots 
  WHERE id = p_slot_id 
    AND status = 'open'
  FOR UPDATE;
  
  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_NOT_AVAILABLE', 'message', 'Slot not available');
  END IF;
  
  -- Verify slot belongs to selected mentor
  IF v_slot.mentor_id != v_selected_mentor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_WRONG_MENTOR', 'message', 'Slot does not belong to your mentor');
  END IF;
  
  -- Verify slot is in the future
  IF v_slot.start_time <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_IN_PAST', 'message', 'Cannot book past slots');
  END IF;
  
  -- Create the session with 30-minute duration
  INSERT INTO public.mentor_sessions (
    mentor_id, 
    candidate_profile_id, 
    availability_slot_id,
    starts_at, 
    ends_at, 
    status, 
    created_by,
    session_type,
    price_cents,
    duration_minutes,
    title
  ) VALUES (
    v_slot.mentor_id, 
    v_candidate_profile_id, 
    v_slot.id,
    v_slot.start_time, 
    v_slot.start_time + interval '30 minutes',
    'requested', 
    'candidate',
    'free_intro',
    0,
    30,
    'Free Intro Session'
  )
  RETURNING id INTO v_session_id;
  
  -- Block the slot
  UPDATE public.mentor_availability_slots 
  SET status = 'blocked' 
  WHERE id = p_slot_id;
  
  -- Mark free intro as used
  UPDATE public.profiles 
  SET free_intro_session_used_at = now() 
  WHERE id = v_candidate_profile_id;
  
  -- Audit log
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    v_session_id, auth.uid(), 'candidate', 'candidate_requested_intro', 
    jsonb_build_object('slot_id', p_slot_id, 'is_free_intro', true, 'duration_minutes', 30)
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'session_id', v_session_id,
    'starts_at', v_slot.start_time,
    'ends_at', v_slot.start_time + interval '30 minutes'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_ALREADY_BOOKED', 'message', 'Slot already booked');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'message', SQLERRM);
END;
$$;

-- =============================================
-- PART B: Membership Plans scaffolding
-- =============================================

-- B1a. Create membership_tier enum
DO $$ BEGIN
  CREATE TYPE public.membership_tier AS ENUM ('freemium', 'basic', 'premium', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B1b. Add membership columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS membership_tier public.membership_tier NOT NULL DEFAULT 'freemium',
ADD COLUMN IF NOT EXISTS membership_started_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS membership_renewal_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE NULL,
ADD COLUMN IF NOT EXISTS referred_by_code text NULL;

-- B1c. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES auth.users(id),
  invited_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  confirmed_at timestamptz NULL,
  UNIQUE(inviter_user_id, invited_user_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- B1d. Create mentor_credits table
CREATE TABLE IF NOT EXISTS public.mentor_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  free_session_credits int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_credits ENABLE ROW LEVEL SECURITY;

-- B1e. Create entitlement_events table
CREATE TABLE IF NOT EXISTS public.entitlement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('monthly_session_grant', 'weekly_session_grant', 'interview_prep_grant', 'referral_grant')),
  amount int NOT NULL DEFAULT 1,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entitlement_events ENABLE ROW LEVEL SECURITY;

-- B1f. Add billing columns to mentor_sessions
ALTER TABLE public.mentor_sessions
ADD COLUMN IF NOT EXISTS billing_source text DEFAULT 'free_credit' CHECK (billing_source IN ('free_credit', 'membership_included', 'paid')),
ADD COLUMN IF NOT EXISTS included_by_tier public.membership_tier NULL;

-- =============================================
-- B2. RLS Policies
-- =============================================

-- Referrals: inviter can read their referrals
CREATE POLICY "Users can view referrals they invited" ON public.referrals
FOR SELECT USING (inviter_user_id = auth.uid());

CREATE POLICY "Users can view their own referral record" ON public.referrals
FOR SELECT USING (invited_user_id = auth.uid());

-- mentor_credits: user can read/update their own row
CREATE POLICY "Users can view own credits" ON public.mentor_credits
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own credits" ON public.mentor_credits
FOR UPDATE USING (user_id = auth.uid());

-- entitlement_events: user can read their events
CREATE POLICY "Users can view own entitlement events" ON public.entitlement_events
FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- B3. RPCs
-- =============================================

-- B3.1 get_membership_status
CREATE OR REPLACE FUNCTION public.get_membership_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier public.membership_tier;
  v_renewal_at timestamptz;
  v_free_credits int;
  v_sessions_used_this_period int;
  v_sessions_limit int;
  v_interview_prep_credits int;
  v_period_start timestamptz;
BEGIN
  -- Get profile info
  SELECT membership_tier, membership_renewal_at
  INTO v_tier, v_renewal_at
  FROM public.profiles WHERE user_id = v_user_id;

  IF v_tier IS NULL THEN v_tier := 'freemium'; END IF;

  -- Get free credits
  SELECT COALESCE(free_session_credits, 0) INTO v_free_credits
  FROM public.mentor_credits WHERE user_id = v_user_id;
  IF v_free_credits IS NULL THEN v_free_credits := 0; END IF;

  -- Calculate period start (current month/week)
  IF v_tier = 'pro' THEN
    v_period_start := date_trunc('week', now());
    v_sessions_limit := 1;
  ELSIF v_tier IN ('basic', 'premium') THEN
    v_period_start := date_trunc('month', now());
    v_sessions_limit := 1;
  ELSE
    v_period_start := date_trunc('month', now());
    v_sessions_limit := 0;
  END IF;

  -- Count sessions used this period (membership-included only)
  SELECT COUNT(*) INTO v_sessions_used_this_period
  FROM public.mentor_sessions
  WHERE candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = v_user_id)
    AND billing_source = 'membership_included'
    AND created_at >= v_period_start
    AND status NOT IN ('cancelled', 'rejected');

  -- Count interview prep credits (premium/pro)
  SELECT COALESCE(SUM(amount), 0) INTO v_interview_prep_credits
  FROM public.entitlement_events
  WHERE user_id = v_user_id AND type = 'interview_prep_grant';

  RETURN jsonb_build_object(
    'tier', v_tier::text,
    'sessions_remaining_current_period', GREATEST(v_sessions_limit - v_sessions_used_this_period, 0),
    'free_session_credits', v_free_credits,
    'unlimited_chat_with_mentor', v_tier IN ('premium', 'pro'),
    'can_book_weekly', v_tier = 'pro',
    'can_access_training_unlimited', v_tier = 'pro',
    'interview_prep_credits', v_interview_prep_credits,
    'renewal_at', v_renewal_at
  );
END;
$$;

-- B3.2 apply_referral_on_signup
CREATE OR REPLACE FUNCTION public.apply_referral_on_signup(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_inviter_user_id uuid;
  v_confirmed_count int;
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

  -- Insert referral (ignore conflict)
  INSERT INTO public.referrals (inviter_user_id, invited_user_id, status, confirmed_at)
  VALUES (v_inviter_user_id, auth.uid(), 'confirmed', now())
  ON CONFLICT (inviter_user_id, invited_user_id) DO NOTHING;

  -- Store referred_by_code on invited user's profile
  UPDATE public.profiles SET referred_by_code = invite_code WHERE user_id = auth.uid();

  -- Count confirmed referrals for inviter
  SELECT COUNT(*) INTO v_confirmed_count
  FROM public.referrals
  WHERE inviter_user_id = v_inviter_user_id AND status = 'confirmed';

  -- Every 5 confirmed referrals → grant 1 free session credit
  IF v_confirmed_count > 0 AND v_confirmed_count % 5 = 0 THEN
    INSERT INTO public.mentor_credits (user_id, free_session_credits, updated_at)
    VALUES (v_inviter_user_id, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
      free_session_credits = mentor_credits.free_session_credits + 1,
      updated_at = now();

    INSERT INTO public.entitlement_events (user_id, type, amount, meta)
    VALUES (v_inviter_user_id, 'referral_grant', 1, jsonb_build_object('confirmed_count', v_confirmed_count));
  END IF;

  RETURN jsonb_build_object('success', true, 'inviter_user_id', v_inviter_user_id);
END;
$$;

-- B3.3 grant_interview_prep_if_3_challenges_completed (helper function, NOT wired to trigger yet)
-- TODO: Wire this to a trigger on challenge_submissions when safe
CREATE OR REPLACE FUNCTION public.grant_interview_prep_if_3_challenges_completed(p_user_id uuid, p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_completed_count int;
  v_tier public.membership_tier;
BEGIN
  -- Check membership tier
  SELECT membership_tier INTO v_tier FROM public.profiles WHERE user_id = p_user_id;
  IF v_tier NOT IN ('premium', 'pro') THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ELIGIBLE', 'message', 'Only premium/pro tiers qualify');
  END IF;

  -- Count completed challenges for this business
  SELECT COUNT(*) INTO v_completed_count
  FROM public.challenge_submissions cs
  WHERE cs.candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id)
    AND cs.business_id = p_business_id
    AND cs.status = 'submitted';

  IF v_completed_count >= 3 AND v_completed_count % 3 = 0 THEN
    INSERT INTO public.entitlement_events (user_id, type, amount, meta)
    VALUES (p_user_id, 'interview_prep_grant', 1, jsonb_build_object('business_id', p_business_id, 'completed', v_completed_count));

    RETURN jsonb_build_object('success', true, 'granted', true, 'completed_count', v_completed_count);
  END IF;

  RETURN jsonb_build_object('success', true, 'granted', false, 'completed_count', v_completed_count);
END;
$$;
