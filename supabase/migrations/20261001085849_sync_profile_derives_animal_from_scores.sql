-- The profile follows the finished result, whichever path wrote it.
-- Logged-in: answers are stored, the completion trigger computes the scores
-- and updates the row again. Guest, after registration: the result arrives
-- finished, with its scores and no answers, and the animal used to be linked
-- by a later best-effort update from the client. Derive everything here from
-- the scores (same pair table as assign_ximatar_by_pillars, same Drive
-- thresholds as archetypeFromScores) so the profile never keeps old numbers
-- next to a new XIMAtar.
CREATE OR REPLACE FUNCTION public.sync_assessment_to_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_label_text text;
  v_label public.ximatar_type;
  v_ximatar_id uuid;
  v_pillars jsonb;
  v_comp numeric; v_comm numeric; v_know numeric; v_crea numeric; v_drive numeric;
  v_strongest text; v_weakest text;
BEGIN
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- The scores of this result: the column when filled, the table otherwise.
  v_pillars := NEW.pillars;
  IF v_pillars IS NULL THEN
    SELECT pg_catalog.jsonb_object_agg(ps.pillar, ps.score) INTO v_pillars
    FROM public.pillar_scores ps WHERE ps.assessment_result_id = NEW.id;
  END IF;
  -- Nothing computed yet (the completion trigger runs first and updates the
  -- row again): wait for that update.
  IF v_pillars IS NULL THEN
    RETURN NEW;
  END IF;

  v_comp  := COALESCE((v_pillars->>'computational_power')::numeric, (v_pillars->>'comp_power')::numeric, 0);
  v_comm  := COALESCE((v_pillars->>'communication')::numeric, 0);
  v_know  := COALESCE((v_pillars->>'knowledge')::numeric, 0);
  v_crea  := COALESCE((v_pillars->>'creativity')::numeric, 0);
  v_drive := COALESCE((v_pillars->>'drive')::numeric, 0);

  -- Same rule as archetypeFromScores: first in canonical order among ties.
  v_strongest := 'computational_power';
  IF v_comm > v_comp THEN v_strongest := 'communication'; END IF;
  IF v_know > GREATEST(v_comp, v_comm) THEN v_strongest := 'knowledge'; END IF;
  IF v_crea > GREATEST(v_comp, v_comm, v_know) THEN v_strongest := 'creativity'; END IF;
  v_weakest := 'computational_power';
  IF v_comm < v_comp THEN v_weakest := 'communication'; END IF;
  IF v_know < LEAST(v_comp, v_comm) THEN v_weakest := 'knowledge'; END IF;
  IF v_crea < LEAST(v_comp, v_comm, v_know) THEN v_weakest := 'creativity'; END IF;
  IF v_weakest = v_strongest THEN v_weakest := 'creativity'; END IF;

  v_label_text := CASE v_strongest || '/' || v_weakest
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

  SELECT x.id INTO v_ximatar_id FROM public.ximatars x WHERE x.label = v_label_text LIMIT 1;
  BEGIN
    v_label := v_label_text::public.ximatar_type;
  EXCEPTION WHEN OTHERS THEN
    v_label := NULL;
  END;

  BEGIN
    UPDATE public.profiles
    SET
      pillar_scores       = pg_catalog.jsonb_build_object('computational_power', v_comp, 'communication', v_comm,
                              'knowledge', v_know, 'creativity', v_crea, 'drive', v_drive),
      strongest_pillar    = v_strongest,
      weakest_pillar      = v_weakest,
      drive_level         = CASE WHEN v_drive >= 7.5 THEN 'high' WHEN v_drive >= 5 THEN 'medium' ELSE 'low' END,
      ximatar_id          = COALESCE(v_ximatar_id, ximatar_id),
      ximatar             = COALESCE(v_label, ximatar),
      ximatar_name        = initcap(v_label_text),
      ximatar_assigned_at = COALESCE(ximatar_assigned_at, now()),
      profile_complete    = true,
      updated_at          = now()
    WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_assessment_to_profile failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
