-- Fix 1: Make compute_pillar_vector completely safe
CREATE OR REPLACE FUNCTION compute_pillar_vector()
RETURNS trigger AS $$
BEGIN
  BEGIN
    DECLARE
      scores jsonb;
      drive_val float;
      comp_val float;
      comm_val float;
      crea_val float;
      know_val float;
    BEGIN
      scores := COALESCE(NEW.pillar_scores, '{}'::jsonb);
      
      IF scores IS NULL OR scores = '{}'::jsonb THEN
        RETURN NEW;
      END IF;
      
      drive_val := COALESCE(
        (scores->>'drive')::float,
        (scores->>'Drive')::float,
        0
      ) / 10.0;
      
      comp_val := COALESCE(
        (scores->>'computational_power')::float,
        (scores->>'computational')::float,
        (scores->>'comp_power')::float,
        0
      ) / 10.0;
      
      comm_val := COALESCE(
        (scores->>'communication')::float,
        (scores->>'Communication')::float,
        0
      ) / 10.0;
      
      crea_val := COALESCE(
        (scores->>'creativity')::float,
        (scores->>'Creativity')::float,
        0
      ) / 10.0;
      
      know_val := COALESCE(
        (scores->>'knowledge')::float,
        (scores->>'Knowledge')::float,
        0
      ) / 10.0;
      
      NEW.pillar_vector := ARRAY[drive_val, comp_val, comm_val, crea_val, know_val]::vector(5);
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'compute_pillar_vector failed: %, skipping', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 2: Recreate trigger to fire on ALL inserts/updates (safer)
DROP TRIGGER IF EXISTS trg_pillar_vector ON profiles;
CREATE TRIGGER trg_pillar_vector
  BEFORE INSERT OR UPDATE
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION compute_pillar_vector();

-- Fix 4: Sync assessment_results → profiles automatically
CREATE OR REPLACE FUNCTION sync_assessment_to_profile()
RETURNS trigger AS $$
BEGIN
  BEGIN
    UPDATE profiles
    SET 
      ximatar_id = COALESCE(NEW.ximatar_id, ximatar_id),
      pillar_scores = COALESCE(NEW.pillars, pillar_scores),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_assessment_to_profile failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_assessment ON assessment_results;
CREATE TRIGGER trg_sync_assessment
  AFTER INSERT OR UPDATE
  ON assessment_results
  FOR EACH ROW
  EXECUTE FUNCTION sync_assessment_to_profile();