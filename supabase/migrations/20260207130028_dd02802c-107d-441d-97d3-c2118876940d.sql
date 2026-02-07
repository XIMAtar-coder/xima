
-- =============================================
-- Add requires_reschedule column to mentor_sessions
-- Update mentor_reject_session to set it for free_intro
-- =============================================

-- 1. Add column
ALTER TABLE public.mentor_sessions
ADD COLUMN IF NOT EXISTS requires_reschedule boolean NOT NULL DEFAULT false;

-- 2. Update mentor_reject_session RPC
CREATE OR REPLACE FUNCTION public.mentor_reject_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  v_mentor_id uuid;
  v_session record;
BEGIN
  SELECT id INTO v_mentor_id FROM public.mentors WHERE user_id = auth.uid();
  
  IF v_mentor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a mentor');
  END IF;
  
  SELECT * INTO v_session FROM public.mentor_sessions 
  WHERE id = p_session_id AND mentor_id = v_mentor_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.status NOT IN ('requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session cannot be rejected');
  END IF;
  
  -- Set rejected + requires_reschedule for free_intro sessions
  UPDATE public.mentor_sessions 
  SET status = 'rejected',
      requires_reschedule = (v_session.session_type = 'free_intro')
  WHERE id = p_session_id;
  
  -- Re-open the slot
  IF v_session.availability_slot_id IS NOT NULL THEN
    UPDATE public.mentor_availability_slots 
    SET status = 'open' 
    WHERE id = v_session.availability_slot_id;
  END IF;
  
  -- DO NOT touch free_intro_session_used_at (handled by completion trigger only)
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'rejected', 
    jsonb_build_object('requires_reschedule', v_session.session_type = 'free_intro')
  );
  
  RETURN jsonb_build_object('success', true, 'requires_reschedule', v_session.session_type = 'free_intro');
END;
$$;

-- 3. Backfill: mark existing rejected free_intro sessions
UPDATE public.mentor_sessions
SET requires_reschedule = true
WHERE session_type = 'free_intro' 
  AND status = 'rejected'
  AND requires_reschedule = false;
