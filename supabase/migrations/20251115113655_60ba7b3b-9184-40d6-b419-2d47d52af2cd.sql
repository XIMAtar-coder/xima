-- Fix XIMAtar assignment: scale vector values from 0-100 to 0-10 range
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  comp_score NUMERIC;
  comm_score NUMERIC;
  know_score NUMERIC;
  crea_score NUMERIC;
  drv_score NUMERIC;
  chosen_label TEXT := 'fox'; -- fallback
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
  -- Get user_id
  SELECT user_id INTO user_uuid FROM assessment_results WHERE id = p_result_id;

  -- Get pillar scores (these are on 0-10 scale)
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
    -- Find closest XIMAtar by weighted Euclidean distance
    FOR ximatar_rec IN 
      SELECT 
        id,
        label,
        vector
      FROM ximatars
    LOOP
      -- Extract and scale vector values from 0-100 to 0-10 range
      vec_comp := COALESCE((ximatar_rec.vector->>'comp_power')::numeric, 50) / 10.0;
      vec_comm := COALESCE((ximatar_rec.vector->>'communication')::numeric, 50) / 10.0;
      vec_know := COALESCE((ximatar_rec.vector->>'knowledge')::numeric, 50) / 10.0;
      vec_crea := COALESCE((ximatar_rec.vector->>'creativity')::numeric, 50) / 10.0;
      vec_drv := COALESCE((ximatar_rec.vector->>'drive')::numeric, 50) / 10.0;

      -- Calculate weighted Euclidean distance
      current_distance := SQRT(
        POWER((comp_score - vec_comp) * 1.0, 2) +
        POWER((comm_score - vec_comm) * 1.1, 2) +
        POWER((know_score - vec_know) * 1.0, 2) +
        POWER((crea_score - vec_crea) * 1.0, 2) +
        POWER((drv_score - vec_drv) * 1.2, 2)
      );

      -- Special bonus for Lion: if drive >= 9 and communication >= 7.5, reduce distance
      IF ximatar_rec.label = 'lion' AND drv_score >= 9.0 AND comm_score >= 7.5 THEN
        current_distance := current_distance * 0.7; -- 30% bonus
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

  -- Fallback if no match found
  IF ximatar_uuid IS NULL THEN
    SELECT id INTO ximatar_uuid FROM ximatars WHERE label = chosen_label LIMIT 1;
  END IF;

  -- Update assessment result
  UPDATE assessment_results
  SET ximatar_id = ximatar_uuid, computed_at = now()
  WHERE id = p_result_id;

  -- Update profile
  UPDATE profiles
  SET ximatar = chosen_label::ximatar_type, ximatar_assigned_at = now()
  WHERE user_id = user_uuid;

  RAISE NOTICE 'Assigned XIMAtar % (id: %) to user % (result_id: %)', 
    chosen_label, ximatar_uuid, user_uuid, p_result_id;
END;
$$;