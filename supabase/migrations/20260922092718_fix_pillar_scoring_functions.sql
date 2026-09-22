-- Le due funzioni di punteggio erano insieme sbagliate e aperte a chiunque.
--
-- 1) La versione a un argomento divideva ogni pilastro per il numero TOTALE di
--    risposte (21) invece che per le domande di quel pilastro (4 o 5): i
--    punteggi uscivano circa cinque volte più bassi del dovuto. Si vede nel
--    risultato del 15/09, l'unico con rationale.method = 'server_computed':
--    0,5–1,43 su 10 invece di 4–8.
-- 2) La versione con le risposte in jsonb moltiplicava ogni risposta per un
--    fattore casuale (0,9–1,2) e usava blocchi fissi di domande (q1-5, q6-9…)
--    invece della rotazione ciclica usata dall'app: stesse risposte, punteggi
--    diversi a ogni esecuzione, e su pilastri diversi da quelli mostrati.
-- 3) Entrambe erano SECURITY DEFINER eseguibili da 'authenticated' con un
--    result_id qualunque: un utente poteva riscrivere i punteggi di un altro.
--
-- Oggi nessun trigger le chiama (il punteggio lo calcola il client), quindi la
-- correzione non tocca nessun risultato esistente.

CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  comp NUMERIC := 0; comm NUMERIC := 0; know NUMERIC := 0; crea NUMERIC := 0; drv NUMERIC := 0;
  w_comp NUMERIC := 0; w_comm NUMERIC := 0; w_know NUMERIC := 0; w_crea NUMERIC := 0; w_drv NUMERIC := 0;
  q RECORD; open1_score NUMERIC; open2_score NUMERIC;
BEGIN
  -- Ogni pilastro si normalizza sulle proprie domande: la risposta vale 0..3.
  FOR q IN
    SELECT answer_value, pillar, COALESCE(weight, 1.0) AS weight
    FROM public.assessment_answers WHERE result_id = p_result_id
  LOOP
    CASE q.pillar
      WHEN 'computational_power' THEN comp := comp + (q.answer_value * q.weight); w_comp := w_comp + q.weight;
      WHEN 'communication'        THEN comm := comm + (q.answer_value * q.weight); w_comm := w_comm + q.weight;
      WHEN 'knowledge'            THEN know := know + (q.answer_value * q.weight); w_know := w_know + q.weight;
      WHEN 'creativity'           THEN crea := crea + (q.answer_value * q.weight); w_crea := w_crea + q.weight;
      WHEN 'drive'                THEN drv  := drv  + (q.answer_value * q.weight); w_drv  := w_drv  + q.weight;
      ELSE NULL;
    END CASE;
  END LOOP;

  IF (w_comp + w_comm + w_know + w_crea + w_drv) = 0 THEN RETURN; END IF;

  comp := CASE WHEN w_comp > 0 THEN pg_catalog.ROUND((comp / (w_comp * 3)) * 10, 2) ELSE 0 END;
  comm := CASE WHEN w_comm > 0 THEN pg_catalog.ROUND((comm / (w_comm * 3)) * 10, 2) ELSE 0 END;
  know := CASE WHEN w_know > 0 THEN pg_catalog.ROUND((know / (w_know * 3)) * 10, 2) ELSE 0 END;
  crea := CASE WHEN w_crea > 0 THEN pg_catalog.ROUND((crea / (w_crea * 3)) * 10, 2) ELSE 0 END;
  drv  := CASE WHEN w_drv  > 0 THEN pg_catalog.ROUND((drv  / (w_drv  * 3)) * 10, 2) ELSE 0 END;

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
         rationale = pg_catalog.jsonb_build_object(
           'pillars', pg_catalog.jsonb_build_object('computational_power', comp, 'communication', comm,
             'knowledge', know, 'creativity', crea, 'drive', drv),
           'method', 'server_computed_v2'),
         computed_at = pg_catalog.now()
   WHERE id = p_result_id;
END;
$function$;

-- La versione con le risposte in jsonb: stessa rotazione ciclica dell'app
-- (q1 calcolo, q2 comunicazione, q3 conoscenza, q4 creatività, q5 motivazione,
-- q6 calcolo…) e nessun fattore casuale.
CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id uuid, p_mc_answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  totals NUMERIC[] := ARRAY[0,0,0,0,0];
  counts NUMERIC[] := ARRAY[0,0,0,0,0];
  answer_val INT; question_num INT; slot INT;
  comp NUMERIC; comm NUMERIC; know NUMERIC; crea NUMERIC; drv NUMERIC;
BEGIN
  FOR question_num IN 1..21 LOOP
    answer_val := COALESCE((p_mc_answers->>('q' || question_num))::int, 0);
    slot := ((question_num - 1) % 5) + 1;  -- 1 calcolo, 2 comunicazione, 3 conoscenza, 4 creatività, 5 motivazione
    totals[slot] := totals[slot] + answer_val;
    counts[slot] := counts[slot] + 1;
  END LOOP;

  comp := CASE WHEN counts[1] > 0 THEN pg_catalog.ROUND((totals[1] / (counts[1] * 3)) * 10, 2) ELSE 0 END;
  comm := CASE WHEN counts[2] > 0 THEN pg_catalog.ROUND((totals[2] / (counts[2] * 3)) * 10, 2) ELSE 0 END;
  know := CASE WHEN counts[3] > 0 THEN pg_catalog.ROUND((totals[3] / (counts[3] * 3)) * 10, 2) ELSE 0 END;
  crea := CASE WHEN counts[4] > 0 THEN pg_catalog.ROUND((totals[4] / (counts[4] * 3)) * 10, 2) ELSE 0 END;
  drv  := CASE WHEN counts[5] > 0 THEN pg_catalog.ROUND((totals[5] / (counts[5] * 3)) * 10, 2) ELSE 0 END;

  INSERT INTO public.pillar_scores (assessment_result_id, pillar, score)
  VALUES (p_result_id, 'computational_power', comp), (p_result_id, 'communication', comm),
         (p_result_id, 'knowledge', know), (p_result_id, 'creativity', crea), (p_result_id, 'drive', drv)
  ON CONFLICT (assessment_result_id, pillar)
  DO UPDATE SET score = EXCLUDED.score, created_at = pg_catalog.now();

  UPDATE public.assessment_results
     SET total_score = comp + comm + know + crea + drv,
         rationale = pg_catalog.jsonb_build_object(
           'pillars', pg_catalog.jsonb_build_object('computational_power', comp, 'communication', comm,
             'knowledge', know, 'creativity', crea, 'drive', drv),
           'method', 'client_mc_computed_v2'),
         computed_at = pg_catalog.now()
   WHERE id = p_result_id;
END;
$function$;

-- Nessun utente finale deve poter ricalcolare (nemmeno i propri) punteggi:
-- restano al service role e ai trigger.
REVOKE EXECUTE ON FUNCTION public.compute_pillar_scores_from_assessment(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_pillar_scores_from_assessment(uuid, jsonb) FROM authenticated;
