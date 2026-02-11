
-- Backfill: fix pillar column on assessment_answers using correct cyclic mapping
-- The cyclic pattern is: pillars[(question_id - 1) % 5]
--   0 → computational_power
--   1 → communication
--   2 → knowledge
--   3 → creativity
--   4 → drive

DO $$
DECLARE
  _updated_count int := 0;
BEGIN
  -- Update assessment_answers rows where pillar doesn't match the cyclic rule
  WITH correct_mapping AS (
    SELECT
      id,
      question_id,
      pillar AS old_pillar,
      CASE (question_id - 1) % 5
        WHEN 0 THEN 'computational_power'
        WHEN 1 THEN 'communication'
        WHEN 2 THEN 'knowledge'
        WHEN 3 THEN 'creativity'
        WHEN 4 THEN 'drive'
      END AS correct_pillar
    FROM assessment_answers
    WHERE question_id BETWEEN 1 AND 21
  )
  UPDATE assessment_answers aa
  SET pillar = cm.correct_pillar
  FROM correct_mapping cm
  WHERE aa.id = cm.id
    AND aa.pillar IS DISTINCT FROM cm.correct_pillar;

  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RAISE NOTICE 'assessment_answers backfill: updated % rows', _updated_count;
END $$;
