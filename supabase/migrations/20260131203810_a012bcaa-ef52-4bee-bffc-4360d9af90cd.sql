-- =====================================================
-- MENTOR CALENDAR SYSTEM: Schema Migration
-- Extend existing tables with new columns and add new tables
-- =====================================================

-- Helper function: Get selected mentor ID for a candidate
CREATE OR REPLACE FUNCTION public.candidate_selected_mentor_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'pg_catalog'
AS $$
  SELECT mm.mentor_user_id
  FROM public.mentor_matches mm
  JOIN public.profiles p ON p.id = mm.mentee_user_id
  WHERE p.user_id = p_user_id
  ORDER BY mm.created_at DESC
  LIMIT 1;
$$;

-- Add missing columns to mentor_availability_slots
ALTER TABLE public.mentor_availability_slots 
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Rome',
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rrule text NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

-- Add check constraint for status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mentor_availability_slots_status_check' 
      AND conrelid = 'public.mentor_availability_slots'::regclass
  ) THEN
    ALTER TABLE public.mentor_availability_slots 
    ADD CONSTRAINT mentor_availability_slots_status_check 
    CHECK (status IN ('open', 'blocked'));
  END IF;
END
$$;

-- Create index on (mentor_id, start_time) if not exists
CREATE INDEX IF NOT EXISTS idx_mentor_availability_mentor_starts 
  ON public.mentor_availability_slots(mentor_id, start_time);

-- =====================================================
-- TABLE: mentor_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  candidate_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  availability_slot_id uuid NULL REFERENCES public.mentor_availability_slots(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested' 
    CHECK (status IN ('requested', 'confirmed', 'rejected', 'cancelled', 'completed', 'rescheduled')),
  title text NULL DEFAULT 'Mentor Session',
  notes_private text NULL,
  notes_shared text NULL,
  created_by text NOT NULL CHECK (created_by IN ('candidate', 'mentor', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_session_times CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor_starts 
  ON public.mentor_sessions(mentor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_candidate_starts 
  ON public.mentor_sessions(candidate_profile_id, starts_at);

-- Prevent double-booking: unique slot for active sessions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot_booking
  ON public.mentor_sessions(availability_slot_id)
  WHERE status IN ('requested', 'confirmed');

-- =====================================================
-- TABLE: mentor_session_audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mentor_session_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  actor_user_id uuid NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('mentor', 'candidate', 'system', 'admin')),
  action text NOT NULL CHECK (action IN ('create_request', 'confirm', 'reject', 'cancel', 'reschedule', 'update_notes', 'complete')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON public.mentor_session_audit_logs(session_id);

-- =====================================================
-- TRIGGERS: Auto-update updated_at
-- =====================================================
DROP TRIGGER IF EXISTS trg_mentor_availability_slots_updated ON public.mentor_availability_slots;
CREATE TRIGGER trg_mentor_availability_slots_updated
  BEFORE UPDATE ON public.mentor_availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mentor_sessions_updated ON public.mentor_sessions;
CREATE TRIGGER trg_mentor_sessions_updated
  BEFORE UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS: mentor_availability_slots
-- =====================================================
ALTER TABLE public.mentor_availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentor can read own availability" ON public.mentor_availability_slots;
CREATE POLICY "Mentor can read own availability"
  ON public.mentor_availability_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m 
      WHERE m.id = mentor_availability_slots.mentor_id 
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Candidate can read selected mentor open slots" ON public.mentor_availability_slots;
CREATE POLICY "Candidate can read selected mentor open slots"
  ON public.mentor_availability_slots FOR SELECT
  USING (
    status = 'open' 
    AND mentor_id = public.candidate_selected_mentor_id(auth.uid())
  );

DROP POLICY IF EXISTS "Mentor can insert own availability" ON public.mentor_availability_slots;
CREATE POLICY "Mentor can insert own availability"
  ON public.mentor_availability_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentors m 
      WHERE m.id = mentor_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Mentor can update own availability" ON public.mentor_availability_slots;
CREATE POLICY "Mentor can update own availability"
  ON public.mentor_availability_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m 
      WHERE m.id = mentor_availability_slots.mentor_id 
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Mentor can delete own availability" ON public.mentor_availability_slots;
CREATE POLICY "Mentor can delete own availability"
  ON public.mentor_availability_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m 
      WHERE m.id = mentor_availability_slots.mentor_id 
        AND m.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: mentor_sessions
-- =====================================================
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentor can read own sessions" ON public.mentor_sessions;
CREATE POLICY "Mentor can read own sessions"
  ON public.mentor_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m 
      WHERE m.id = mentor_sessions.mentor_id 
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Candidate can read own sessions" ON public.mentor_sessions;
CREATE POLICY "Candidate can read own sessions"
  ON public.mentor_sessions FOR SELECT
  USING (
    candidate_profile_id = public.get_profile_id_for_auth_user(auth.uid())
  );

DROP POLICY IF EXISTS "Mentor can update own sessions" ON public.mentor_sessions;
CREATE POLICY "Mentor can update own sessions"
  ON public.mentor_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m 
      WHERE m.id = mentor_sessions.mentor_id 
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Candidate can cancel own sessions" ON public.mentor_sessions;
CREATE POLICY "Candidate can cancel own sessions"
  ON public.mentor_sessions FOR UPDATE
  USING (
    candidate_profile_id = public.get_profile_id_for_auth_user(auth.uid())
  )
  WITH CHECK (
    candidate_profile_id = public.get_profile_id_for_auth_user(auth.uid())
    AND status = 'cancelled'
  );

-- =====================================================
-- RLS: mentor_session_audit_logs
-- =====================================================
ALTER TABLE public.mentor_session_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentor can read session audit logs" ON public.mentor_session_audit_logs;
CREATE POLICY "Mentor can read session audit logs"
  ON public.mentor_session_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_sessions ms
      JOIN public.mentors m ON m.id = ms.mentor_id
      WHERE ms.id = mentor_session_audit_logs.session_id 
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Candidate can read session audit logs" ON public.mentor_session_audit_logs;
CREATE POLICY "Candidate can read session audit logs"
  ON public.mentor_session_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_sessions ms
      WHERE ms.id = mentor_session_audit_logs.session_id 
        AND ms.candidate_profile_id = public.get_profile_id_for_auth_user(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert audit logs for own sessions" ON public.mentor_session_audit_logs;
CREATE POLICY "Authenticated can insert audit logs for own sessions"
  ON public.mentor_session_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentor_sessions ms
      WHERE ms.id = session_id
        AND (
          ms.candidate_profile_id = public.get_profile_id_for_auth_user(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.mentors m 
            WHERE m.id = ms.mentor_id AND m.user_id = auth.uid()
          )
        )
    )
  );

-- =====================================================
-- RPC: request_mentor_session (uses start_time/end_time from existing table)
-- =====================================================
CREATE OR REPLACE FUNCTION public.request_mentor_session(p_slot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  v_candidate_profile_id uuid;
  v_selected_mentor_id uuid;
  v_slot record;
  v_session_id uuid;
BEGIN
  SELECT id INTO v_candidate_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF v_candidate_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  v_selected_mentor_id := public.candidate_selected_mentor_id(auth.uid());
  
  IF v_selected_mentor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No mentor selected');
  END IF;
  
  -- Use start_time/end_time from existing table schema
  SELECT * INTO v_slot 
  FROM public.mentor_availability_slots 
  WHERE id = p_slot_id 
    AND status = 'open'
  FOR UPDATE;
  
  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not available');
  END IF;
  
  IF v_slot.mentor_id != v_selected_mentor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot does not belong to your mentor');
  END IF;
  
  IF v_slot.start_time <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot book past slots');
  END IF;
  
  INSERT INTO public.mentor_sessions (
    mentor_id, candidate_profile_id, availability_slot_id,
    starts_at, ends_at, status, created_by
  ) VALUES (
    v_slot.mentor_id, v_candidate_profile_id, v_slot.id,
    v_slot.start_time, v_slot.end_time, 'requested', 'candidate'
  )
  RETURNING id INTO v_session_id;
  
  UPDATE public.mentor_availability_slots 
  SET status = 'blocked' 
  WHERE id = p_slot_id;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    v_session_id, auth.uid(), 'candidate', 'create_request', '{}'::jsonb
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'session_id', v_session_id,
    'starts_at', v_slot.start_time,
    'ends_at', v_slot.end_time
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot already booked');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- RPC: mentor_confirm_session
-- =====================================================
CREATE OR REPLACE FUNCTION public.mentor_confirm_session(p_session_id uuid)
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
  
  IF v_session.status != 'requested' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session cannot be confirmed');
  END IF;
  
  UPDATE public.mentor_sessions SET status = 'confirmed' WHERE id = p_session_id;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'confirm', '{}'::jsonb
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: mentor_reject_session
-- =====================================================
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
  
  UPDATE public.mentor_sessions SET status = 'rejected' WHERE id = p_session_id;
  
  IF v_session.availability_slot_id IS NOT NULL THEN
    UPDATE public.mentor_availability_slots 
    SET status = 'open' 
    WHERE id = v_session.availability_slot_id;
  END IF;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'reject', '{}'::jsonb
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: mentor_cancel_session
-- =====================================================
CREATE OR REPLACE FUNCTION public.mentor_cancel_session(p_session_id uuid)
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
  
  IF v_session.status IN ('cancelled', 'completed', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session cannot be cancelled');
  END IF;
  
  UPDATE public.mentor_sessions SET status = 'cancelled' WHERE id = p_session_id;
  
  IF v_session.availability_slot_id IS NOT NULL THEN
    UPDATE public.mentor_availability_slots 
    SET status = 'open' 
    WHERE id = v_session.availability_slot_id;
  END IF;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'cancel', '{}'::jsonb
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: candidate_cancel_session
-- =====================================================
CREATE OR REPLACE FUNCTION public.candidate_cancel_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  v_profile_id uuid;
  v_session record;
BEGIN
  v_profile_id := public.get_profile_id_for_auth_user(auth.uid());
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  SELECT * INTO v_session FROM public.mentor_sessions 
  WHERE id = p_session_id AND candidate_profile_id = v_profile_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.status IN ('cancelled', 'completed', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session cannot be cancelled');
  END IF;
  
  UPDATE public.mentor_sessions SET status = 'cancelled' WHERE id = p_session_id;
  
  IF v_session.availability_slot_id IS NOT NULL THEN
    UPDATE public.mentor_availability_slots 
    SET status = 'open' 
    WHERE id = v_session.availability_slot_id;
  END IF;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'candidate', 'cancel', '{}'::jsonb
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: mentor_reschedule_session
-- =====================================================
CREATE OR REPLACE FUNCTION public.mentor_reschedule_session(
  p_session_id uuid,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz
)
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
  
  IF p_new_ends_at <= p_new_starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid time range');
  END IF;
  
  IF p_new_starts_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reschedule to past');
  END IF;
  
  SELECT * INTO v_session FROM public.mentor_sessions 
  WHERE id = p_session_id AND mentor_id = v_mentor_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.status IN ('cancelled', 'completed', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session cannot be rescheduled');
  END IF;
  
  UPDATE public.mentor_sessions 
  SET starts_at = p_new_starts_at, 
      ends_at = p_new_ends_at, 
      status = 'rescheduled',
      availability_slot_id = NULL
  WHERE id = p_session_id;
  
  IF v_session.availability_slot_id IS NOT NULL THEN
    UPDATE public.mentor_availability_slots 
    SET status = 'open' 
    WHERE id = v_session.availability_slot_id;
  END IF;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'reschedule', 
    jsonb_build_object('new_starts_at', p_new_starts_at, 'new_ends_at', p_new_ends_at)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: mentor_complete_session
-- =====================================================
CREATE OR REPLACE FUNCTION public.mentor_complete_session(p_session_id uuid)
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
  
  IF v_session.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only confirmed sessions can be completed');
  END IF;
  
  UPDATE public.mentor_sessions SET status = 'completed' WHERE id = p_session_id;
  
  INSERT INTO public.mentor_session_audit_logs (
    session_id, actor_user_id, actor_role, action, meta
  ) VALUES (
    p_session_id, auth.uid(), 'mentor', 'complete', '{}'::jsonb
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.request_mentor_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_confirm_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_reject_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_cancel_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_cancel_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_reschedule_session(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_complete_session(uuid) TO authenticated;