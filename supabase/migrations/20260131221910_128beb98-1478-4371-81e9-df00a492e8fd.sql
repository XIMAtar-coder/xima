-- =====================================================
-- PART 1: Add reschedule proposal columns to mentor_sessions
-- =====================================================

-- Add columns for reschedule handshake (2-step proposal)
ALTER TABLE public.mentor_sessions
ADD COLUMN IF NOT EXISTS proposed_start_at timestamptz,
ADD COLUMN IF NOT EXISTS proposed_end_at timestamptz,
ADD COLUMN IF NOT EXISTS proposed_availability_slot_id uuid REFERENCES public.mentor_availability_slots(id),
ADD COLUMN IF NOT EXISTS reschedule_status text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS reschedule_proposed_at timestamptz,
ADD COLUMN IF NOT EXISTS reschedule_responded_at timestamptz;

-- Add check constraint for reschedule_status
ALTER TABLE public.mentor_sessions
ADD CONSTRAINT mentor_sessions_reschedule_status_check
CHECK (reschedule_status IN ('none', 'proposed', 'accepted', 'rejected'));

-- =====================================================
-- PART 2: Update audit log action constraint
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.mentor_session_audit_logs 
DROP CONSTRAINT IF EXISTS mentor_session_audit_logs_action_check;

-- Recreate with all needed actions including reschedule handshake and video room
ALTER TABLE public.mentor_session_audit_logs 
ADD CONSTRAINT mentor_session_audit_logs_action_check 
CHECK (action = ANY (ARRAY[
  -- Request actions
  'create_request'::text,
  'candidate_requested_intro'::text,
  'requested'::text,
  -- Confirmation flow
  'confirm'::text,
  'confirmed'::text,
  'reject'::text,
  'rejected'::text,
  -- Cancellation
  'cancel'::text,
  'cancelled'::text,
  'mentor_cancelled'::text,
  'candidate_cancelled'::text,
  -- Reschedule - original
  'reschedule'::text,
  'rescheduled'::text,
  -- Reschedule handshake (NEW)
  'mentor_proposed_reschedule'::text,
  'candidate_accepted_reschedule'::text,
  'candidate_rejected_reschedule'::text,
  -- Completion
  'complete'::text,
  'completed'::text,
  -- Notes/updates
  'update_notes'::text,
  -- Video room actions (support both naming conventions)
  'room_created'::text,
  'room_joined'::text,
  'video_room_created'::text,
  'video_room_joined'::text,
  -- System
  'system_note'::text
]));

-- =====================================================
-- PART 3: Update mentor_reschedule_session to use proposal model
-- =====================================================

CREATE OR REPLACE FUNCTION public.mentor_reschedule_session(
  p_session_id uuid,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mentor_id uuid;
  v_session record;
BEGIN
  -- Get the mentor's ID
  SELECT id INTO v_mentor_id FROM public.mentors WHERE user_id = auth.uid();
  
  IF v_mentor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a mentor');
  END IF;
  
  -- Validate time range
  IF p_new_ends_at <= p_new_starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid time range');
  END IF;
  
  IF p_new_starts_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reschedule to past');
  END IF;
  
  -- Fetch the session
  SELECT * INTO v_session FROM public.mentor_sessions 
  WHERE id = p_session_id AND mentor_id = v_mentor_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.status IN ('cancelled', 'completed', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session cannot be rescheduled');
  END IF;
  
  -- Set proposal fields instead of directly changing times
  UPDATE public.mentor_sessions 
  SET 
    proposed_start_at = p_new_starts_at, 
    proposed_end_at = p_new_ends_at, 
    reschedule_status = 'proposed',
    reschedule_proposed_at = now(),
    reschedule_responded_at = NULL,
    updated_at = now()
  WHERE id = p_session_id;
  
  -- Audit log
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'mentor_proposed_reschedule', 
    jsonb_build_object(
      'old_starts_at', v_session.starts_at, 
      'old_ends_at', v_session.ends_at,
      'proposed_starts_at', p_new_starts_at, 
      'proposed_ends_at', p_new_ends_at
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- PART 4: Create candidate_accept_reschedule RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.candidate_accept_reschedule(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_profile_id uuid;
  v_session record;
BEGIN
  -- Get the candidate's profile ID
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- Fetch the session
  SELECT * INTO v_session FROM public.mentor_sessions 
  WHERE id = p_session_id AND candidate_profile_id = v_profile_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  -- Check if there's a pending proposal
  IF v_session.reschedule_status != 'proposed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending reschedule proposal');
  END IF;
  
  IF v_session.proposed_start_at IS NULL OR v_session.proposed_end_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid proposal data');
  END IF;
  
  -- Accept: copy proposed times to actual times
  UPDATE public.mentor_sessions 
  SET 
    starts_at = proposed_start_at, 
    ends_at = proposed_end_at,
    availability_slot_id = proposed_availability_slot_id,
    proposed_start_at = NULL, 
    proposed_end_at = NULL,
    proposed_availability_slot_id = NULL,
    reschedule_status = 'accepted',
    reschedule_responded_at = now(),
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_session_id;
  
  -- Audit log
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'candidate', 'candidate_accepted_reschedule', 
    jsonb_build_object(
      'new_starts_at', v_session.proposed_start_at, 
      'new_ends_at', v_session.proposed_end_at
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.candidate_accept_reschedule(uuid) TO authenticated;

-- =====================================================
-- PART 5: Create candidate_reject_reschedule RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.candidate_reject_reschedule(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_profile_id uuid;
  v_session record;
BEGIN
  -- Get the candidate's profile ID
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- Fetch the session
  SELECT * INTO v_session FROM public.mentor_sessions 
  WHERE id = p_session_id AND candidate_profile_id = v_profile_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  -- Check if there's a pending proposal
  IF v_session.reschedule_status != 'proposed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending reschedule proposal');
  END IF;
  
  -- Reject: keep original times, clear proposal
  UPDATE public.mentor_sessions 
  SET 
    proposed_start_at = NULL, 
    proposed_end_at = NULL,
    proposed_availability_slot_id = NULL,
    reschedule_status = 'rejected',
    reschedule_responded_at = now(),
    updated_at = now()
  WHERE id = p_session_id;
  
  -- Audit log
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'candidate', 'candidate_rejected_reschedule', 
    jsonb_build_object(
      'rejected_starts_at', v_session.proposed_start_at, 
      'rejected_ends_at', v_session.proposed_end_at
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.candidate_reject_reschedule(uuid) TO authenticated;