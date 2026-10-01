-- Two faults in the server side of the assessment, both invisible to guests
-- until they registered:
--  1. compute_pillar_scores_from_assessment added a bonus from the open
--     answers that the client model (computeScoresV2) does not have, so the
--     animal on the results page and the one saved could differ.
--  2. sync_assessment_to_profile copied assessment_results.pillars, a column
--     nobody fills since the scores moved to rationale/pillar_scores: the
--     profile got the new XIMAtar and kept the old numbers, Drive level and
--     strongest/weakest pillar. The scores now land in that column too; the
--     sync itself is rewritten in the next migration.
CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  comp NUMERIC := 0; comm NUMERIC := 0; know NUMERIC := 0; crea NUMERIC := 0; drv NUMERIC := 0;
  w_drv NUMERIC := 0; content_total NUMERIC := 0;
  q RECORD; v_pillars jsonb;
BEGIN
  FOR q IN
    SELECT answer_value, pillar, COALESCE(weight, 1.0) AS weight
    FROM public.assessment_answers WHERE result_id = p_result_id
  LOOP
    CASE q.pillar
      WHEN 'computational_power' THEN comp := comp + (q.answer_value * q.weight);
      WHEN 'communication'        THEN comm := comm + (q.answer_value * q.weight);
      WHEN 'knowledge'            THEN know := know + (q.answer_value * q.weight);
      WHEN 'creativity'           THEN crea := crea + (q.answer_value * q.weight);
      WHEN 'drive'                THEN drv  := drv  + (q.answer_value * q.weight); w_drv := w_drv + q.weight;
      ELSE NULL;
    END CASE;
  END LOOP;

  content_total := comp + comm + know + crea;
  IF content_total = 0 AND w_drv = 0 THEN RETURN; END IF;

  -- Same formula as computeScoresV2 on the client: the share of the profile,
  -- read on 0-10 through the square root (25% -> 5, 100% -> 10). Nothing else.
  IF content_total > 0 THEN
    comp := pg_catalog.ROUND((10 * |/ (comp / content_total))::numeric, 2);
    comm := pg_catalog.ROUND((10 * |/ (comm / content_total))::numeric, 2);
    know := pg_catalog.ROUND((10 * |/ (know / content_total))::numeric, 2);
    crea := pg_catalog.ROUND((10 * |/ (crea / content_total))::numeric, 2);
  END IF;
  drv := CASE WHEN w_drv > 0 THEN pg_catalog.ROUND((drv / (w_drv * 3)) * 10, 2) ELSE 0 END;

  comp := GREATEST(0, LEAST(10, comp)); comm := GREATEST(0, LEAST(10, comm));
  know := GREATEST(0, LEAST(10, know)); crea := GREATEST(0, LEAST(10, crea));
  drv  := GREATEST(0, LEAST(10, drv));

  INSERT INTO public.pillar_scores (assessment_result_id, pillar, score)
  VALUES (p_result_id, 'computational_power', comp), (p_result_id, 'communication', comm),
         (p_result_id, 'knowledge', know), (p_result_id, 'creativity', crea), (p_result_id, 'drive', drv)
  ON CONFLICT (assessment_result_id, pillar)
  DO UPDATE SET score = EXCLUDED.score, created_at = pg_catalog.now();

  v_pillars := pg_catalog.jsonb_build_object('computational_power', comp, 'communication', comm,
                 'knowledge', know, 'creativity', crea, 'drive', drv);

  UPDATE public.assessment_results
     SET total_score = comp + comm + know + crea + drv,
         pillars = v_pillars,
         rationale = COALESCE(rationale, '{}'::jsonb) || pg_catalog.jsonb_build_object(
           'pillars', v_pillars, 'method', 'server_computed_v2_share'),
         computed_at = pg_catalog.now()
   WHERE id = p_result_id;
END;
$function$;
