-- Ensure assessment computation trigger exists
DROP TRIGGER IF EXISTS trg_assessment_completed ON public.assessment_results;
CREATE TRIGGER trg_assessment_completed
AFTER INSERT OR UPDATE ON public.assessment_results
FOR EACH ROW
WHEN (NEW.completed IS TRUE)
EXECUTE FUNCTION public.on_assessment_completed_trigger();

-- Add unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pillar_scores_unique'
  ) THEN
    ALTER TABLE public.pillar_scores 
      ADD CONSTRAINT pillar_scores_unique UNIQUE (assessment_result_id, pillar);
  END IF;
END $$;