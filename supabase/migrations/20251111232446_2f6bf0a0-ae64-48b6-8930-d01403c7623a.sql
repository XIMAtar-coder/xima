-- Create function to calculate pillar scores from assessment with dynamic variance
CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id UUID, p_mc_answers JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comp NUMERIC := 0;
  comm NUMERIC := 0;
  know NUMERIC := 0;
  crea NUMERIC := 0;
  drv NUMERIC := 0;
  total_questions INT := 21;
  answer_val INT;
  question_num INT;
  variance_factor NUMERIC;
BEGIN
  -- Map each question to pillars with different weights for variance
  -- Questions 1-5: Computational Power
  FOR question_num IN 1..5 LOOP
    answer_val := (p_mc_answers->>question_num::text)::int;
    IF answer_val IS NOT NULL THEN
      comp := comp + (answer_val + 1) * 1.3; -- Weight: 1.3
    END IF;
  END LOOP;

  -- Questions 6-10: Communication
  FOR question_num IN 6..10 LOOP
    answer_val := (p_mc_answers->>question_num::text)::int;
    IF answer_val IS NOT NULL THEN
      comm := comm + (answer_val + 1) * 1.0; -- Weight: 1.0
    END IF;
  END LOOP;

  -- Questions 11-14: Knowledge
  FOR question_num IN 11..14 LOOP
    answer_val := (p_mc_answers->>question_num::text)::int;
    IF answer_val IS NOT NULL THEN
      know := know + (answer_val + 1) * 1.1; -- Weight: 1.1
    END IF;
  END LOOP;

  -- Questions 15-18: Creativity
  FOR question_num IN 15..18 LOOP
    answer_val := (p_mc_answers->>question_num::text)::int;
    IF answer_val IS NOT NULL THEN
      crea := crea + (answer_val + 1) * 1.2; -- Weight: 1.2
    END IF;
  END LOOP;

  -- Questions 19-21: Drive
  FOR question_num IN 19..21 LOOP
    answer_val := (p_mc_answers->>question_num::text)::int;
    IF answer_val IS NOT NULL THEN
      drv := drv + (answer_val + 1) * 1.15; -- Weight: 1.15
    END IF;
  END LOOP;

  -- Normalize to 0-10 scale (each answer is 0-3, so max per pillar varies by weight and count)
  comp := ROUND((comp / (5 * 4 * 1.3)) * 10, 2);
  comm := ROUND((comm / (5 * 4 * 1.0)) * 10, 2);
  know := ROUND((know / (4 * 4 * 1.1)) * 10, 2);
  crea := ROUND((crea / (4 * 4 * 1.2)) * 10, 2);
  drv := ROUND((drv / (3 * 4 * 1.15)) * 10, 2);

  -- Blend in open response scores if they exist
  DECLARE
    open1_score NUMERIC;
    open2_score NUMERIC;
  BEGIN
    SELECT AVG(score) INTO open1_score
    FROM assessment_open_responses
    WHERE assessment_open_responses.attempt_id IN (
      SELECT attempt_id FROM assessment_results WHERE id = p_result_id
    )
    AND open_key = 'open1';

    SELECT AVG(score) INTO open2_score
    FROM assessment_open_responses
    WHERE assessment_open_responses.attempt_id IN (
      SELECT attempt_id FROM assessment_results WHERE id = p_result_id
    )
    AND open_key = 'open2';

    IF open1_score IS NOT NULL THEN
      crea := crea + (open1_score / 100.0) * 0.6;
      comm := comm + (open1_score / 100.0) * 0.4;
    END IF;

    IF open2_score IS NOT NULL THEN
      drv := drv + (open2_score / 100.0) * 0.6;
      know := know + (open2_score / 100.0) * 0.4;
    END IF;
  END;

  -- Ensure scores are within 0-10
  comp := GREATEST(0, LEAST(10, comp));
  comm := GREATEST(0, LEAST(10, comm));
  know := GREATEST(0, LEAST(10, know));
  crea := GREATEST(0, LEAST(10, crea));
  drv := GREATEST(0, LEAST(10, drv));

  -- Insert or update pillar scores
  INSERT INTO pillar_scores (assessment_result_id, pillar, score)
  VALUES
    (p_result_id, 'computational_power', comp),
    (p_result_id, 'communication', comm),
    (p_result_id, 'knowledge', know),
    (p_result_id, 'creativity', crea),
    (p_result_id, 'drive', drv)
  ON CONFLICT (assessment_result_id, pillar) 
  DO UPDATE SET score = EXCLUDED.score, created_at = now();

  -- Update assessment_results with rationale
  UPDATE assessment_results
  SET 
    rationale = jsonb_build_object(
      'pillars', jsonb_build_object(
        'computational_power', comp,
        'communication', comm,
        'knowledge', know,
        'creativity', crea,
        'drive', drv
      ),
      'method', 'dynamic_weighted'
    ),
    total_score = comp + comm + know + crea + drv,
    computed_at = now()
  WHERE id = p_result_id;
END;
$$;

-- Enhanced XIMAtar assignment based on top 2 pillars
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  top_pillars TEXT[];
  pillar1 TEXT;
  pillar2 TEXT;
  score1 NUMERIC;
  score2 NUMERIC;
  chosen_ximatar TEXT;
  ximatar_uuid UUID;
  user_uuid UUID;
BEGIN
  -- Get user_id from result
  SELECT user_id INTO user_uuid FROM assessment_results WHERE id = p_result_id;

  -- Get top 2 pillars by score
  SELECT ARRAY_AGG(pillar ORDER BY score DESC)
  INTO top_pillars
  FROM (
    SELECT pillar, score
    FROM pillar_scores
    WHERE assessment_result_id = p_result_id
    ORDER BY score DESC
    LIMIT 2
  ) t;

  IF top_pillars IS NULL OR array_length(top_pillars, 1) < 2 THEN
    chosen_ximatar := 'fox'; -- fallback
  ELSE
    pillar1 := top_pillars[1];
    pillar2 := top_pillars[2];

    -- XIMAtar assignment logic based on pillar combinations
    IF (pillar1 = 'creativity' AND pillar2 = 'communication') OR (pillar2 = 'creativity' AND pillar1 = 'communication') THEN
      chosen_ximatar := 'parrot'; -- Visionary/Communicator
    ELSIF (pillar1 = 'knowledge' AND pillar2 = 'computational_power') OR (pillar2 = 'knowledge' AND pillar1 = 'computational_power') THEN
      chosen_ximatar := 'owl'; -- Analyst
    ELSIF (pillar1 = 'drive' AND pillar2 = 'knowledge') OR (pillar2 = 'drive' AND pillar1 = 'knowledge') THEN
      chosen_ximatar := 'elephant'; -- Performer/Strategist
    ELSIF (pillar1 = 'communication' AND pillar2 = 'drive') OR (pillar2 = 'communication' AND pillar1 = 'drive') THEN
      chosen_ximatar := 'dolphin'; -- Connector
    ELSIF (pillar1 = 'computational_power' AND pillar2 = 'creativity') OR (pillar2 = 'computational_power' AND pillar1 = 'creativity') THEN
      chosen_ximatar := 'cat'; -- Innovator
    ELSIF pillar1 = 'drive' OR pillar2 = 'drive' THEN
      chosen_ximatar := 'horse'; -- Driver
    ELSIF pillar1 = 'creativity' OR pillar2 = 'creativity' THEN
      chosen_ximatar := 'fox'; -- Creative
    ELSIF pillar1 = 'computational_power' OR pillar2 = 'computational_power' THEN
      chosen_ximatar := 'bee'; -- Systematic
    ELSE
      chosen_ximatar := 'chameleon'; -- Adaptive
    END IF;
  END IF;

  -- Get XIMAtar UUID
  SELECT id INTO ximatar_uuid FROM ximatars WHERE label = chosen_ximatar LIMIT 1;

  -- Update assessment result with XIMAtar
  UPDATE assessment_results
  SET ximatar_id = ximatar_uuid, computed_at = now()
  WHERE id = p_result_id;

  -- Update profile
  UPDATE profiles
  SET ximatar = chosen_ximatar::ximatar_type, ximatar_assigned_at = now()
  WHERE user_id = user_uuid;
END;
$$;

-- Add attempt_id column to assessment_results if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assessment_results' 
    AND column_name = 'attempt_id'
  ) THEN
    ALTER TABLE public.assessment_results ADD COLUMN attempt_id UUID;
  END IF;
END $$;