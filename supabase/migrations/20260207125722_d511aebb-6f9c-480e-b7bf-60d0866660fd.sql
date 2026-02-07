
-- =============================================
-- FIX: Free intro should only be consumed on COMPLETION, not on request.
-- =============================================

-- 1. Update the RPC to NOT set free_intro_session_used_at on request.
--    Instead, block if there's an active (pending/confirmed) free_intro session.
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
  v_active_free_intro_count int;
BEGIN
  -- Get candidate profile
  SELECT id, free_intro_session_used_at INTO v_candidate_profile_id, v_existing_free_intro
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF v_candidate_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Profile not found');
  END IF;
  
  -- Block if free intro already COMPLETED (used_at is set)
  IF v_existing_free_intro IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'FREE_INTRO_ALREADY_USED', 'message', 'You have already used your free intro session');
  END IF;
  
  -- Block if there is already a pending/confirmed free_intro session (prevent double-booking)
  SELECT COUNT(*) INTO v_active_free_intro_count
  FROM public.mentor_sessions
  WHERE candidate_profile_id = v_candidate_profile_id
    AND session_type = 'free_intro'
    AND status IN ('requested', 'confirmed', 'rescheduled');

  IF v_active_free_intro_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'FREE_INTRO_PENDING', 'message', 'You already have an active free intro request');
  END IF;
  
  -- Resolve selected mentor
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
  
  -- Create the session (do NOT mark free intro as used yet)
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
  
  -- NOTE: free_intro_session_used_at is NOT set here anymore.
  -- It will be set by trigger when session status transitions to 'completed'.
  
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

-- 2. Create trigger to mark free intro as used ONLY on session completion
CREATE OR REPLACE FUNCTION public.mark_free_intro_used_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  -- Only fire when status transitions TO 'completed' and session is free_intro
  IF NEW.status = 'completed' 
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.session_type = 'free_intro' THEN
    
    -- Idempotent: only set if not already set
    UPDATE public.profiles
    SET free_intro_session_used_at = now()
    WHERE id = NEW.candidate_profile_id
      AND free_intro_session_used_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicate
DROP TRIGGER IF EXISTS trg_mark_free_intro_used ON public.mentor_sessions;

CREATE TRIGGER trg_mark_free_intro_used
  AFTER UPDATE ON public.mentor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_free_intro_used_on_completion();

-- 3. Backfill: reset free_intro_session_used_at for candidates who have NO completed free_intro session
--    (they were incorrectly marked as used on request)
UPDATE public.profiles p
SET free_intro_session_used_at = NULL
WHERE p.free_intro_session_used_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.mentor_sessions ms
    WHERE ms.candidate_profile_id = p.id
      AND ms.session_type = 'free_intro'
      AND ms.status = 'completed'
  );

-- SANITY CHECK (as comment):
-- After this migration:
-- SELECT id, free_intro_session_used_at FROM profiles WHERE free_intro_session_used_at IS NOT NULL;
-- ^ Should only contain profiles with a completed free_intro session.
-- SELECT id, status FROM mentor_sessions WHERE session_type='free_intro' AND status='rejected';
-- ^ These candidates should have free_intro_session_used_at = NULL in profiles.
