
-- Fix: Expand check constraint to include all actual audit actions used

-- Drop the existing restrictive constraint
ALTER TABLE public.mentor_session_audit_logs 
DROP CONSTRAINT IF EXISTS mentor_session_audit_logs_action_check;

-- Recreate with comprehensive allowed list covering all current and future actions
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
  -- Reschedule
  'reschedule'::text,
  'rescheduled'::text,
  -- Completion
  'complete'::text,
  'completed'::text,
  -- Notes/updates
  'update_notes'::text,
  -- Video room actions
  'room_created'::text,
  'room_joined'::text,
  -- System
  'system_note'::text
]));
