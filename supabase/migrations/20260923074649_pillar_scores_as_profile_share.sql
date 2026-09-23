-- I quattro pilastri di contenuto sono una scelta forzata: ogni scenario offre
-- una risposta per pilastro, quindi quello che una persona dà a uno lo toglie
-- agli altri. I loro valori sono quote di un profilo, non quattro livelli
-- indipendenti. Dividendo ognuno per tutto il questionario (3 × 21) ogni
-- profilo reale usciva tra 1 e 3 su 10: è quello che hanno visto Pietro e
-- Roberta provando il percorso.
--
-- Ora si misura la quota e il 10 è una sua lettura:
--   quota_p  = Σ intensità su p ÷ Σ intensità sui quattro
--   punteggio = 10 × √quota_p
-- Un pilastro scelto quanto gli altri tre (25%) legge 5, un pilastro che si
-- prende tutto il profilo legge 10. La trasformazione è monotona: l'ordine dei
-- pilastri, e quindi l'animale (la coppia forte/debole), non cambia.
--
-- Il Drive resta assoluto: ha le sue cinque scene dove entrambe le risposte
-- sono serie, quindi Σ intensità delle scelte di slancio ÷ (3 × 5) × 10.

CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  comp NUMERIC := 0; comm NUMERIC := 0; know NUMERIC := 0; crea NUMERIC := 0; drv NUMERIC := 0;
  w_drv NUMERIC := 0; content_total NUMERIC := 0;
  q RECORD; open1_score NUMERIC; open2_score NUMERIC;
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

  -- Quota sul profilo, letta su 0-10 con la radice: 25% → 5, 100% → 10.
  IF content_total > 0 THEN
    comp := pg_catalog.ROUND(10 * |/ (comp / content_total), 2);
    comm := pg_catalog.ROUND(10 * |/ (comm / content_total), 2);
    know := pg_catalog.ROUND(10 * |/ (know / content_total), 2);
    crea := pg_catalog.ROUND(10 * |/ (crea / content_total), 2);
  END IF;
  drv := CASE WHEN w_drv > 0 THEN pg_catalog.ROUND((drv / (w_drv * 3)) * 10, 2) ELSE 0 END;

  SELECT AVG(score) INTO open1_score FROM public.assessment_open_responses
   WHERE attempt_id IN (SELECT attempt_id FROM public.assessment_results WHERE id = p_result_id) AND open_key = 'open1';
  SELECT AVG(score) INTO open2_score FROM public.assessment_open_responses
   WHERE attempt_id IN (SELECT attempt_id FROM public.assessment_results WHERE id = p_result_id) AND open_key = 'open2';

  IF open1_score IS NOT NULL THEN crea := crea + ((open1_score / 100.0) * 0.6); comm := comm + ((open1_score / 100.0) * 0.4); END IF;
  IF open2_score IS NOT NULL THEN drv  := drv  + ((open2_score / 100.0) * 0.6); know := know + ((open2_score / 100.0) * 0.4); END IF;

  comp := GREATEST(0, LEAST(10, comp)); comm := GREATEST(0, LEAST(10, comm));
  know := GREATEST(0, LEAST(10, know)); crea := GREATEST(0, LEAST(10, crea));
  drv  := GREATEST(0, LEAST(10, drv));

  INSERT INTO public.pillar_scores (assessment_result_id, pillar, score)
  VALUES (p_result_id, 'computational_power', comp), (p_result_id, 'communication', comm),
         (p_result_id, 'knowledge', know), (p_result_id, 'creativity', crea), (p_result_id, 'drive', drv)
  ON CONFLICT (assessment_result_id, pillar)
  DO UPDATE SET score = EXCLUDED.score, created_at = pg_catalog.now();

  UPDATE public.assessment_results
     SET total_score = comp + comm + know + crea + drv,
         rationale = COALESCE(rationale, '{}'::jsonb) || pg_catalog.jsonb_build_object(
           'pillars', pg_catalog.jsonb_build_object('computational_power', comp, 'communication', comm,
             'knowledge', know, 'creativity', crea, 'drive', drv),
           'method', 'server_computed_v2_share'),
         computed_at = pg_catalog.now()
   WHERE id = p_result_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.compute_pillar_scores_from_assessment(uuid) FROM authenticated, anon;
