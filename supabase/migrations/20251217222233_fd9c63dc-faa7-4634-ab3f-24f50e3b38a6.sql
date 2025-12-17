-- Add time window columns to business_challenges
ALTER TABLE public.business_challenges
ADD COLUMN IF NOT EXISTS start_at timestamptz,
ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- Add index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_business_challenges_time_window 
ON public.business_challenges (start_at, end_at) 
WHERE status = 'active';