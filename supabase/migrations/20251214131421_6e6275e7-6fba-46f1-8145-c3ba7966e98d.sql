-- 1. Add CHECK constraint for completed hiring goals
ALTER TABLE public.hiring_goal_drafts
ADD CONSTRAINT hiring_goal_completed_fields_check CHECK (
  status != 'completed' OR (
    task_description IS NOT NULL AND task_description != '' AND
    experience_level IS NOT NULL AND
    work_model IS NOT NULL AND
    country IS NOT NULL AND country != '' AND
    salary_min IS NOT NULL AND
    salary_max IS NOT NULL AND
    salary_min <= salary_max AND
    salary_currency IS NOT NULL AND
    salary_period IS NOT NULL
  )
);

-- 2. Add index for efficient latest draft fetching
CREATE INDEX IF NOT EXISTS idx_hiring_goal_drafts_business_updated
ON public.hiring_goal_drafts (business_id, updated_at DESC);

-- 3. Create trigger to update updated_at if not exists
CREATE OR REPLACE FUNCTION public.update_hiring_goal_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_hiring_goal_drafts_updated_at ON public.hiring_goal_drafts;
CREATE TRIGGER update_hiring_goal_drafts_updated_at
  BEFORE UPDATE ON public.hiring_goal_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hiring_goal_drafts_updated_at();

-- 4. Add optional JSONB column for salary benchmark data
ALTER TABLE public.hiring_goal_drafts
ADD COLUMN IF NOT EXISTS salary_benchmark_json jsonb NULL;