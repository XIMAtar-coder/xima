-- Step 4.2: Free intro session tracking + enforcement

-- 1. Add column to profiles to track free intro usage
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS free_intro_session_used_at timestamptz NULL;

-- 2. Add columns to mentor_sessions for session metadata (only if missing)
ALTER TABLE public.mentor_sessions 
ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'intro';

ALTER TABLE public.mentor_sessions 
ADD COLUMN IF NOT EXISTS price_cents int DEFAULT 0;

ALTER TABLE public.mentor_sessions 
ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 15;

-- 3. Create partial unique index to prevent double booking same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentor_sessions_unique_slot 
ON public.mentor_sessions (availability_slot_id) 
WHERE availability_slot_id IS NOT NULL;

-- 4. Create the RPC for requesting a free intro session
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
  
  -- Create the session
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
    v_slot.end_time, 
    'requested', 
    'candidate',
    'intro',
    0,
    15,
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
    jsonb_build_object('slot_id', p_slot_id, 'is_free_intro', true)
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'session_id', v_session_id,
    'starts_at', v_slot.start_time,
    'ends_at', v_slot.end_time
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_ALREADY_BOOKED', 'message', 'Slot already booked');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'message', SQLERRM);
END;
$$;

-- 5. RLS policies for mentor_sessions (ensure candidate can SELECT own rows)
-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mentor_sessions' 
    AND policyname = 'Candidates can view own sessions'
  ) THEN
    CREATE POLICY "Candidates can view own sessions"
    ON public.mentor_sessions
    FOR SELECT
    USING (
      candidate_profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Ensure mentor_session_audit_logs has proper policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mentor_session_audit_logs' 
    AND policyname = 'Session participants can view audit logs'
  ) THEN
    CREATE POLICY "Session participants can view audit logs"
    ON public.mentor_session_audit_logs
    FOR SELECT
    USING (
      session_id IN (
        SELECT ms.id FROM public.mentor_sessions ms
        WHERE ms.candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
           OR ms.mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
      )
    );
  END IF;
END $$;