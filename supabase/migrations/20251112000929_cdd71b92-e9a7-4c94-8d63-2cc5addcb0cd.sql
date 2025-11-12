-- Fix wrong FK on assessment_results.user_id -> profiles.id
ALTER TABLE public.assessment_results
  DROP CONSTRAINT IF EXISTS assessment_results_user_id_fkey;

-- Correct FK to profiles.user_id to match auth.uid() semantics and RLS
ALTER TABLE public.assessment_results
  ADD CONSTRAINT assessment_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;

-- Verify pillar_scores unique constraint (idempotent block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pillar_scores_unique'
  ) THEN
    ALTER TABLE public.pillar_scores
      ADD CONSTRAINT pillar_scores_unique UNIQUE (assessment_result_id, pillar);
  END IF;
END $$;