-- Assessment 2.0: due ambiti nuovi e l'animale scelto per coppia (forte, debole).

ALTER TABLE public.assessment_open_responses DROP CONSTRAINT IF EXISTS assessment_open_responses_field_key_check;
ALTER TABLE public.assessment_open_responses ADD CONSTRAINT assessment_open_responses_field_key_check
  CHECK (field_key = ANY (ARRAY['science_tech','business_leadership','arts_creative','service_ops','trades_operations','restaurant']));

ALTER TABLE public.assessment_results DROP CONSTRAINT IF EXISTS assessment_results_field_key_check;
ALTER TABLE public.assessment_results ADD CONSTRAINT assessment_results_field_key_check
  CHECK (field_key = ANY (ARRAY['science_tech','business_leadership','arts_creative','service_ops','trades_operations','restaurant']));

-- Tassonomia 2.0 (22/09/2026): l'archetipo è la coppia ordinata (pilastro più
-- forte, più debole) tra i quattro pilastri di contenuto: 4 × 3 = 12 animali.
-- Prima si cercava il vettore più vicino tra 12 prototipi che avevano solo 7
-- forme distinte: Gufo, Ape e Cavallo erano identici a meno del Drive, e cinque
-- forme non avevano nessun animale. Il Drive resta l'energia, non l'identità.
-- Parità: vince l'ordine canonico (calcolo, comunicazione, conoscenza,
-- creatività), lo stesso di src/lib/assessment/v2/model.ts.
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  user_uuid UUID;
  v_comp NUMERIC; v_comm NUMERIC; v_know NUMERIC; v_crea NUMERIC;
  strongest TEXT; weakest TEXT; chosen_label TEXT; ximatar_uuid UUID;
BEGIN
  SELECT user_id INTO user_uuid FROM public.assessment_results WHERE id = p_result_id;

  SELECT
    COALESCE(MAX(CASE WHEN pillar = 'computational_power' THEN score END), 0),
    COALESCE(MAX(CASE WHEN pillar = 'communication'       THEN score END), 0),
    COALESCE(MAX(CASE WHEN pillar = 'knowledge'           THEN score END), 0),
    COALESCE(MAX(CASE WHEN pillar = 'creativity'          THEN score END), 0)
  INTO v_comp, v_comm, v_know, v_crea
  FROM public.pillar_scores WHERE assessment_result_id = p_result_id;

  -- Più forte: il primo in ordine canonico tra i massimi.
  strongest := 'computational_power';
  IF v_comm > v_comp THEN strongest := 'communication'; END IF;
  IF v_know > GREATEST(v_comp, v_comm) THEN strongest := 'knowledge'; END IF;
  IF v_crea > GREATEST(v_comp, v_comm, v_know) THEN strongest := 'creativity'; END IF;

  -- Più debole: il primo in ordine canonico tra i minimi.
  weakest := 'computational_power';
  IF v_comm < v_comp THEN weakest := 'communication'; END IF;
  IF v_know < LEAST(v_comp, v_comm) THEN weakest := 'knowledge'; END IF;
  IF v_crea < LEAST(v_comp, v_comm, v_know) THEN weakest := 'creativity'; END IF;
  IF weakest = strongest THEN weakest := 'creativity'; END IF;  -- profilo piatto

  chosen_label := CASE strongest || '/' || weakest
    WHEN 'computational_power/creativity'    THEN 'owl'
    WHEN 'computational_power/communication' THEN 'cat'
    WHEN 'computational_power/knowledge'     THEN 'horse'
    WHEN 'communication/creativity'          THEN 'wolf'
    WHEN 'communication/computational_power' THEN 'parrot'
    WHEN 'communication/knowledge'           THEN 'lion'
    WHEN 'knowledge/creativity'              THEN 'elephant'
    WHEN 'knowledge/communication'           THEN 'bear'
    WHEN 'knowledge/computational_power'     THEN 'bee'
    WHEN 'creativity/knowledge'              THEN 'fox'
    WHEN 'creativity/computational_power'    THEN 'dolphin'
    WHEN 'creativity/communication'          THEN 'chameleon'
    ELSE 'fox' END;

  SELECT id INTO ximatar_uuid FROM public.ximatars WHERE label = chosen_label LIMIT 1;

  UPDATE public.assessment_results
     SET ximatar_id = ximatar_uuid, computed_at = pg_catalog.now()
   WHERE id = p_result_id;
  UPDATE public.profiles
     SET ximatar = chosen_label::public.ximatar_type, ximatar_assigned_at = pg_catalog.now()
   WHERE user_id = user_uuid;
END;
$function$;
