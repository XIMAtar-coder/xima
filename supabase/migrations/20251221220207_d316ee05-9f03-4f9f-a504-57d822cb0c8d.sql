-- Drop existing constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recreate constraint with 'challenge_invitation' added
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('challenge', 'challenge_invitation', 'job_offer', 'message', 'system'));