-- Update assign_ximatar_by_pillars to include Bear bonus logic
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_uuid UUID;
  comp_score NUMERIC;
  comm_score NUMERIC;
  know_score NUMERIC;
  crea_score NUMERIC;
  drv_score NUMERIC;
  chosen_label TEXT := 'fox';
  ximatar_uuid UUID;
  min_distance NUMERIC := 999999;
  current_distance NUMERIC;
  ximatar_rec RECORD;
  vec_comp NUMERIC;
  vec_comm NUMERIC;
  vec_know NUMERIC;
  vec_crea NUMERIC;
  vec_drv NUMERIC;
BEGIN
  SELECT user_id INTO user_uuid FROM assessment_results WHERE id = p_result_id;

  SELECT 
    MAX(CASE WHEN pillar = 'computational_power' THEN score END) as comp,
    MAX(CASE WHEN pillar = 'communication' THEN score END) as comm,
    MAX(CASE WHEN pillar = 'knowledge' THEN score END) as know,
    MAX(CASE WHEN pillar = 'creativity' THEN score END) as crea,
    MAX(CASE WHEN pillar = 'drive' THEN score END) as drv
  INTO comp_score, comm_score, know_score, crea_score, drv_score
  FROM pillar_scores
  WHERE assessment_result_id = p_result_id;

  IF comp_score IS NULL THEN
    RAISE WARNING 'No pillar scores found for result_id: %. Using fallback.', p_result_id;
    chosen_label := 'fox';
  ELSE
    FOR ximatar_rec IN 
      SELECT id, label, vector
      FROM ximatars
    LOOP
      vec_comp := COALESCE((ximatar_rec.vector->>'comp_power')::numeric, 50) / 10.0;
      vec_comm := COALESCE((ximatar_rec.vector->>'communication')::numeric, 50) / 10.0;
      vec_know := COALESCE((ximatar_rec.vector->>'knowledge')::numeric, 50) / 10.0;
      vec_crea := COALESCE((ximatar_rec.vector->>'creativity')::numeric, 50) / 10.0;
      vec_drv := COALESCE((ximatar_rec.vector->>'drive')::numeric, 50) / 10.0;

      current_distance := SQRT(
        POWER((comp_score - vec_comp) * 1.0, 2) +
        POWER((comm_score - vec_comm) * 1.1, 2) +
        POWER((know_score - vec_know) * 1.0, 2) +
        POWER((crea_score - vec_crea) * 1.0, 2) +
        POWER((drv_score - vec_drv) * 1.2, 2)
      );

      -- Special bonus for Lion
      IF ximatar_rec.label = 'lion' AND drv_score >= 9.0 AND comm_score >= 7.5 THEN
        current_distance := current_distance * 0.7;
      END IF;

      -- Special bonus for Fox
      IF ximatar_rec.label = 'fox' AND crea_score >= 9.0 AND comm_score >= 8.5 THEN
        current_distance := current_distance * 0.7;
      END IF;

      -- Special bonus for Dolphin
      IF ximatar_rec.label = 'dolphin' AND comm_score >= 8.5 AND crea_score >= 7.5 THEN
        current_distance := current_distance * 0.7;
      END IF;

      -- Special bonus for Cat
      IF ximatar_rec.label = 'cat' AND comp_score >= 8.0 AND crea_score >= 8.0 AND comm_score <= 7.0 THEN
        current_distance := current_distance * 0.7;
      END IF;

      -- Special bonus for Bear
      IF ximatar_rec.label = 'bear' AND drv_score >= 8.0 AND know_score >= 8.0 AND crea_score <= 5.0 THEN
        current_distance := current_distance * 0.7;
      END IF;

      RAISE NOTICE 'XIMAtar % (vec: c=%, cm=%, k=%, cr=%, d=%): distance = %.2f from user scores (c=%, cm=%, k=%, cr=%, d=%)', 
        ximatar_rec.label, vec_comp, vec_comm, vec_know, vec_crea, vec_drv,
        current_distance, comp_score, comm_score, know_score, crea_score, drv_score;

      IF current_distance < min_distance THEN
        min_distance := current_distance;
        chosen_label := ximatar_rec.label;
        ximatar_uuid := ximatar_rec.id;
      END IF;
    END LOOP;

    RAISE NOTICE 'Selected XIMAtar: % with distance %.2f', chosen_label, min_distance;
  END IF;

  IF ximatar_uuid IS NULL THEN
    SELECT id INTO ximatar_uuid FROM ximatars WHERE label = chosen_label LIMIT 1;
  END IF;

  UPDATE assessment_results
  SET ximatar_id = ximatar_uuid, computed_at = now()
  WHERE id = p_result_id;

  UPDATE profiles
  SET ximatar = chosen_label::ximatar_type, ximatar_assigned_at = now()
  WHERE user_id = user_uuid;

  RAISE NOTICE 'Assigned XIMAtar % (id: %) to user % (result_id: %)', 
    chosen_label, ximatar_uuid, user_uuid, p_result_id;
END;
$function$;