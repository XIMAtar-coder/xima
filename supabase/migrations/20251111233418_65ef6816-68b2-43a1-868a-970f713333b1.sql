-- Create assessment_answers table to store multiple choice responses
CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  answer_value INTEGER NOT NULL,
  pillar TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_answers_result_id ON assessment_answers(result_id);

-- Add completed flag to assessment_results if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assessment_results' 
    AND column_name = 'completed'
  ) THEN
    ALTER TABLE public.assessment_results ADD COLUMN completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update the compute function to work with assessment_answers table
CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id UUID)
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
  total_weights NUMERIC := 0;
  q RECORD;
BEGIN
  -- Read answers from assessment_answers table
  FOR q IN
    SELECT question_id, answer_value, pillar, COALESCE(weight, 1.0) as weight
    FROM assessment_answers
    WHERE result_id = p_result_id
  LOOP
    total_weights := total_weights + q.weight;
    
    CASE q.pillar
      WHEN 'computational_power' THEN comp := comp + (q.answer_value * q.weight);
      WHEN 'communication'        THEN comm := comm + (q.answer_value * q.weight);
      WHEN 'knowledge'            THEN know := know + (q.answer_value * q.weight);
      WHEN 'creativity'           THEN crea := crea + (q.answer_value * q.weight);
      WHEN 'drive'                THEN drv  := drv  + (q.answer_value * q.weight);
    END CASE;
  END LOOP;

  IF total_weights = 0 THEN
    RAISE NOTICE 'No answers found for assessment result: %', p_result_id;
    RETURN;
  END IF;

  -- Normalize to 0-10 scale based on answer range (0-3 per question)
  -- Each pillar has different number of questions, so normalize accordingly
  comp := ROUND((comp / (total_weights * 3)) * 10, 2);
  comm := ROUND((comm / (total_weights * 3)) * 10, 2);
  know := ROUND((know / (total_weights * 3)) * 10, 2);
  crea := ROUND((crea / (total_weights * 3)) * 10, 2);
  drv  := ROUND((drv  / (total_weights * 3)) * 10, 2);

  -- Blend in open response scores if they exist
  DECLARE
    open1_score NUMERIC;
    open2_score NUMERIC;
  BEGIN
    SELECT AVG(score) INTO open1_score
    FROM assessment_open_responses
    WHERE attempt_id IN (
      SELECT attempt_id FROM assessment_results WHERE id = p_result_id
    )
    AND open_key = 'open1';

    SELECT AVG(score) INTO open2_score
    FROM assessment_open_responses
    WHERE attempt_id IN (
      SELECT attempt_id FROM assessment_results WHERE id = p_result_id
    )
    AND open_key = 'open2';

    IF open1_score IS NOT NULL THEN
      crea := crea + ((open1_score / 100.0) * 0.6);
      comm := comm + ((open1_score / 100.0) * 0.4);
    END IF;

    IF open2_score IS NOT NULL THEN
      drv := drv + ((open2_score / 100.0) * 0.6);
      know := know + ((open2_score / 100.0) * 0.4);
    END IF;
  END;

  -- Ensure scores are within 0-10
  comp := GREATEST(0, LEAST(10, comp));
  comm := GREATEST(0, LEAST(10, comm));
  know := GREATEST(0, LEAST(10, know));
  crea := GREATEST(0, LEAST(10, crea));
  drv := GREATEST(0, LEAST(10, drv));

  -- Upsert pillar scores
  INSERT INTO pillar_scores (assessment_result_id, pillar, score)
  VALUES
    (p_result_id, 'computational_power', comp),
    (p_result_id, 'communication', comm),
    (p_result_id, 'knowledge', know),
    (p_result_id, 'creativity', crea),
    (p_result_id, 'drive', drv)
  ON CONFLICT (assessment_result_id, pillar) 
  DO UPDATE SET score = EXCLUDED.score, created_at = now();

  -- Update assessment_results with total score and rationale
  UPDATE assessment_results
  SET 
    total_score = comp + comm + know + crea + drv,
    rationale = jsonb_build_object(
      'pillars', jsonb_build_object(
        'computational_power', comp,
        'communication', comm,
        'knowledge', know,
        'creativity', crea,
        'drive', drv
      ),
      'method', 'server_computed'
    ),
    computed_at = now()
  WHERE id = p_result_id;

  RAISE NOTICE 'Computed pillar scores for result %: comp=%, comm=%, know=%, crea=%, drv=%', 
    p_result_id, comp, comm, know, crea, drv;
END;
$$;

-- Update XIMAtar assignment function
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  top_pillars TEXT[];
  pillar1 TEXT;
  pillar2 TEXT;
  chosen_label TEXT := 'fox'; -- fallback
  ximatar_uuid UUID;
BEGIN
  -- Get user_id
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
    chosen_label := 'fox';
  ELSE
    pillar1 := top_pillars[1];
    pillar2 := top_pillars[2];

    -- Deterministic mapping based on top 2 pillars
    IF (pillar1 = 'creativity' AND pillar2 = 'communication') OR 
       (pillar2 = 'creativity' AND pillar1 = 'communication') THEN
      chosen_label := 'parrot';
    ELSIF (pillar1 = 'knowledge' AND pillar2 = 'computational_power') OR 
          (pillar2 = 'knowledge' AND pillar1 = 'computational_power') THEN
      chosen_label := 'owl';
    ELSIF (pillar1 = 'drive' AND pillar2 = 'knowledge') OR 
          (pillar2 = 'drive' AND pillar1 = 'knowledge') THEN
      chosen_label := 'elephant';
    ELSIF (pillar1 = 'communication' AND pillar2 = 'drive') OR 
          (pillar2 = 'communication' AND pillar1 = 'drive') THEN
      chosen_label := 'dolphin';
    ELSIF (pillar1 = 'computational_power' AND pillar2 = 'creativity') OR 
          (pillar2 = 'computational_power' AND pillar1 = 'creativity') THEN
      chosen_label := 'cat';
    ELSIF pillar1 = 'drive' OR pillar2 = 'drive' THEN
      chosen_label := 'horse';
    ELSIF pillar1 = 'creativity' OR pillar2 = 'creativity' THEN
      chosen_label := 'fox';
    ELSIF pillar1 = 'computational_power' OR pillar2 = 'computational_power' THEN
      chosen_label := 'bee';
    ELSIF pillar1 = 'knowledge' OR pillar2 = 'knowledge' THEN
      chosen_label := 'owl';
    ELSIF pillar1 = 'communication' OR pillar2 = 'communication' THEN
      chosen_label := 'dolphin';
    ELSE
      chosen_label := 'chameleon';
    END IF;
  END IF;

  -- Get XIMAtar UUID
  SELECT id INTO ximatar_uuid 
  FROM ximatars 
  WHERE LOWER(label) = LOWER(chosen_label) 
  LIMIT 1;

  -- Update assessment result
  UPDATE assessment_results
  SET ximatar_id = ximatar_uuid, computed_at = now()
  WHERE id = p_result_id;

  -- Update profile
  UPDATE profiles
  SET ximatar = chosen_label::ximatar_type, ximatar_assigned_at = now()
  WHERE user_id = user_uuid;

  RAISE NOTICE 'Assigned XIMAtar % to user % (top pillars: %)', chosen_label, user_uuid, top_pillars;
END;
$$;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.on_assessment_completed_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    RAISE NOTICE 'Assessment completed for result_id: %. Starting computation...', NEW.id;
    
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
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_assessment_completed ON assessment_results;
CREATE TRIGGER trg_assessment_completed
AFTER INSERT OR UPDATE ON assessment_results
FOR EACH ROW
WHEN (NEW.completed IS TRUE)
EXECUTE FUNCTION public.on_assessment_completed_trigger();

-- Add RLS policies for assessment_answers
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own assessment answers"
  ON assessment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_results
      WHERE assessment_results.id = assessment_answers.result_id
      AND assessment_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own assessment answers"
  ON assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_results
      WHERE assessment_results.id = assessment_answers.result_id
      AND assessment_results.user_id = auth.uid()
    )
  );