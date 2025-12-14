-- Add rubric JSONB column to business_challenges for evaluation criteria
ALTER TABLE public.business_challenges 
ADD COLUMN IF NOT EXISTS rubric jsonb DEFAULT '{"criteria": {"outcome": 1, "clarity": 1, "reasoning": 1}}'::jsonb;

-- Add success_criteria array and time_estimate columns
ALTER TABLE public.business_challenges 
ADD COLUMN IF NOT EXISTS success_criteria text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS time_estimate_minutes integer DEFAULT 30;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_challenges_goal_status 
ON public.business_challenges(business_id, hiring_goal_id, status);