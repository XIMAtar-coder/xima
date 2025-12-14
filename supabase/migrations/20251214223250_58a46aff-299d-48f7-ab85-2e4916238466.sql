-- Add missing columns to existing business_challenges table
ALTER TABLE public.business_challenges 
ADD COLUMN IF NOT EXISTS hiring_goal_id uuid REFERENCES public.hiring_goal_drafts(id) ON DELETE SET NULL;

ALTER TABLE public.business_challenges 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- Add check constraint for status values
ALTER TABLE public.business_challenges 
DROP CONSTRAINT IF EXISTS business_challenges_status_check;

ALTER TABLE public.business_challenges 
ADD CONSTRAINT business_challenges_status_check 
CHECK (status IN ('draft', 'active', 'archived'));

-- Create index for efficient lookups (if not exists)
DROP INDEX IF EXISTS idx_business_challenges_lookup;
CREATE INDEX idx_business_challenges_lookup 
ON public.business_challenges(business_id, hiring_goal_id, status);

-- Add challenge_id to challenge_invitations
ALTER TABLE public.challenge_invitations 
ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.business_challenges(id);