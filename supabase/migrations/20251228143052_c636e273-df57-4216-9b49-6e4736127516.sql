-- Drop existing constraint and add updated one with all needed notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'challenge'::text, 
  'challenge_invitation'::text, 
  'job_offer'::text, 
  'message'::text, 
  'system'::text,
  'submission_received'::text,
  'shortlisted'::text,
  'followup_requested'::text,
  'passed'::text,
  'advanced_level2'::text
]));