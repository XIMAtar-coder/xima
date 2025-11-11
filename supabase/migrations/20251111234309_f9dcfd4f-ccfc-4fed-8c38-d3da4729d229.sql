-- Add better logging to the trigger to help debug
CREATE OR REPLACE FUNCTION public.on_assessment_completed_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    RAISE NOTICE 'Assessment completed for result_id: %. Starting computation...', NEW.id;
    
    -- Check if we have answers
    DECLARE
      answer_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO answer_count
      FROM assessment_answers
      WHERE result_id = NEW.id;
      
      RAISE NOTICE 'Found % answers for result_id: %', answer_count, NEW.id;
      
      IF answer_count = 0 THEN
        RAISE WARNING 'No answers found for result_id: %. Skipping computation.', NEW.id;
        RETURN NEW;
      END IF;
    END;
    
    -- Compute pillar scores
    PERFORM public.compute_pillar_scores_from_assessment(NEW.id);
    
    -- Assign XIMAtar
    PERFORM public.assign_ximatar_by_pillars(NEW.id);
    
    -- Log activity
    PERFORM public.log_user_activity(
      NEW.user_id,
      'assessment_computed',
      jsonb_build_object('result_id', NEW.id, 'timestamp', now())
    );
    
    RAISE NOTICE 'Completed computation for result_id: %', NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Improve the XIMAtar assignment to use more variety
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_uuid UUID;
  pillar_scores_rec RECORD;
  top_pillar TEXT;
  second_pillar TEXT;
  chosen_label TEXT := 'fox'; -- fallback
  ximatar_uuid UUID;
  comp_score NUMERIC;
  comm_score NUMERIC;
  know_score NUMERIC;
  crea_score NUMERIC;
  drv_score NUMERIC;
BEGIN
  -- Get user_id
  SELECT user_id INTO user_uuid FROM assessment_results WHERE id = p_result_id;

  -- Get pillar scores
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
    -- Find top 2 pillars by score
    SELECT pillar INTO top_pillar
    FROM pillar_scores
    WHERE assessment_result_id = p_result_id
    ORDER BY score DESC
    LIMIT 1;
    
    SELECT pillar INTO second_pillar
    FROM pillar_scores
    WHERE assessment_result_id = p_result_id
    AND pillar != top_pillar
    ORDER BY score DESC
    LIMIT 1;

    RAISE NOTICE 'Top pillars for result_id %: % (%.2f), % (%.2f)', 
      p_result_id, top_pillar, 
      CASE top_pillar 
        WHEN 'computational_power' THEN comp_score
        WHEN 'communication' THEN comm_score
        WHEN 'knowledge' THEN know_score
        WHEN 'creativity' THEN crea_score
        WHEN 'drive' THEN drv_score
      END,
      second_pillar,
      CASE second_pillar
        WHEN 'computational_power' THEN comp_score
        WHEN 'communication' THEN comm_score
        WHEN 'knowledge' THEN know_score
        WHEN 'creativity' THEN crea_score
        WHEN 'drive' THEN drv_score
      END;

    -- Enhanced XIMAtar assignment with more variety
    IF (top_pillar = 'creativity' AND second_pillar = 'communication') OR 
       (second_pillar = 'creativity' AND top_pillar = 'communication') THEN
      chosen_label := 'parrot';
    ELSIF (top_pillar = 'knowledge' AND second_pillar = 'computational_power') OR 
          (second_pillar = 'knowledge' AND top_pillar = 'computational_power') THEN
      chosen_label := 'owl';
    ELSIF (top_pillar = 'drive' AND second_pillar = 'knowledge') OR 
          (second_pillar = 'drive' AND top_pillar = 'knowledge') THEN
      chosen_label := 'elephant';
    ELSIF (top_pillar = 'communication' AND second_pillar = 'drive') OR 
          (second_pillar = 'communication' AND top_pillar = 'drive') THEN
      chosen_label := 'dolphin';
    ELSIF (top_pillar = 'computational_power' AND second_pillar = 'creativity') OR 
          (second_pillar = 'computational_power' AND top_pillar = 'creativity') THEN
      chosen_label := 'cat';
    ELSIF (top_pillar = 'drive' AND second_pillar = 'computational_power') OR
          (second_pillar = 'drive' AND top_pillar = 'computational_power') THEN
      chosen_label := 'bee';
    ELSIF (top_pillar = 'drive' AND second_pillar = 'creativity') OR
          (second_pillar = 'drive' AND top_pillar = 'creativity') THEN
      chosen_label := 'horse';
    ELSIF (top_pillar = 'communication' AND second_pillar = 'knowledge') OR
          (second_pillar = 'communication' AND top_pillar = 'knowledge') THEN
      chosen_label := 'dolphin';
    ELSIF top_pillar = 'drive' AND drv_score >= 8.0 THEN
      IF comm_score >= 7.0 THEN
        chosen_label := 'wolf';
      ELSIF know_score >= 7.0 THEN
        chosen_label := 'bear';
      ELSE
        chosen_label := 'horse';
      END IF;
    ELSIF top_pillar = 'creativity' THEN
      chosen_label := 'fox';
    ELSIF top_pillar = 'computational_power' THEN
      chosen_label := 'bee';
    ELSIF top_pillar = 'knowledge' THEN
      chosen_label := 'owl';
    ELSIF top_pillar = 'communication' THEN
      chosen_label := 'parrot';
    ELSIF top_pillar = 'drive' THEN
      chosen_label := 'horse';
    ELSE
      chosen_label := 'chameleon';
    END IF;
  END IF;

  -- Get XIMAtar UUID
  SELECT id INTO ximatar_uuid 
  FROM ximatars 
  WHERE LOWER(label) = LOWER(chosen_label) 
  LIMIT 1;

  IF ximatar_uuid IS NULL THEN
    RAISE WARNING 'XIMAtar % not found in ximatars table. Using fox fallback.', chosen_label;
    SELECT id INTO ximatar_uuid FROM ximatars WHERE LOWER(label) = 'fox' LIMIT 1;
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
$function$;