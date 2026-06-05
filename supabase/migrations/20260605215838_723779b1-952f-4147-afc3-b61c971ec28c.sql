
-- Part 1.5: allow authenticated users to insert their own pillar_scores
GRANT INSERT ON public.pillar_scores TO authenticated;

DROP POLICY IF EXISTS "pillar_scores_owner_insert" ON public.pillar_scores;
CREATE POLICY "pillar_scores_owner_insert"
  ON public.pillar_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_results ar
      WHERE ar.id = pillar_scores.assessment_result_id
        AND ar.user_id = auth.uid()
    )
  );

-- Part 2: extend sync_assessment_to_profile trigger
CREATE OR REPLACE FUNCTION public.sync_assessment_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_label_text text;
  v_label public.ximatar_type;
BEGIN
  IF NEW.ximatar_id IS NOT NULL THEN
    SELECT x.label INTO v_label_text FROM public.ximatars x WHERE x.id = NEW.ximatar_id;
    IF v_label_text IS NOT NULL THEN
      BEGIN
        v_label := v_label_text::public.ximatar_type;
      EXCEPTION WHEN OTHERS THEN
        v_label := NULL;
      END;
    END IF;
  END IF;

  BEGIN
    UPDATE public.profiles
    SET
      pillar_scores       = COALESCE(NEW.pillars, pillar_scores),
      ximatar_id          = COALESCE(NEW.ximatar_id, ximatar_id),
      ximatar             = COALESCE(v_label, ximatar),
      ximatar_name        = COALESCE(initcap(v_label_text), ximatar_name),
      ximatar_assigned_at = CASE
                              WHEN NEW.ximatar_id IS NOT NULL AND ximatar_assigned_at IS NULL
                              THEN now()
                              ELSE ximatar_assigned_at
                            END,
      profile_complete    = CASE
                              WHEN NEW.pillars IS NOT NULL AND NEW.ximatar_id IS NOT NULL
                              THEN true
                              ELSE profile_complete
                            END,
      updated_at          = now()
    WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_assessment_to_profile failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
