-- Add L2 challenge generation support columns to business_challenges
ALTER TABLE public.business_challenges 
ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS generation_error text,
ADD COLUMN IF NOT EXISTS config_json jsonb,
ADD COLUMN IF NOT EXISTS context_snapshot jsonb;

-- Add check constraint for generation_status values
ALTER TABLE public.business_challenges 
ADD CONSTRAINT business_challenges_generation_status_check 
CHECK (generation_status IN ('draft', 'generating', 'ready', 'failed', 'needs_review'));

-- Add index on job_post_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_challenges_job_post_id ON public.business_challenges(job_post_id);

-- Add index on generation_status for filtering
CREATE INDEX IF NOT EXISTS idx_business_challenges_generation_status ON public.business_challenges(generation_status);

-- Comment on new columns
COMMENT ON COLUMN public.business_challenges.level IS 'Challenge level: 1=Soft skills, 2=Role-based hard skills';
COMMENT ON COLUMN public.business_challenges.generation_status IS 'AI generation status: draft|generating|ready|failed|needs_review';
COMMENT ON COLUMN public.business_challenges.generation_error IS 'Error message if AI generation failed';
COMMENT ON COLUMN public.business_challenges.config_json IS 'L2 challenge configuration: steps, rubric, etc.';
COMMENT ON COLUMN public.business_challenges.context_snapshot IS 'Inputs used for AI generation: job post, company profile';