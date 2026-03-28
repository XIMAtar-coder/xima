
-- 1. TRAJECTORY UPDATE trigger
CREATE OR REPLACE FUNCTION feed_on_trajectory_update()
RETURNS trigger AS $$
DECLARE
  pillar_name TEXT;
  delta_value FLOAT;
BEGIN
  IF ABS(COALESCE(NEW.drive_delta, 0)) >= ABS(COALESCE(NEW.computational_power_delta, 0))
     AND ABS(COALESCE(NEW.drive_delta, 0)) >= ABS(COALESCE(NEW.communication_delta, 0))
     AND ABS(COALESCE(NEW.drive_delta, 0)) >= ABS(COALESCE(NEW.creativity_delta, 0))
     AND ABS(COALESCE(NEW.drive_delta, 0)) >= ABS(COALESCE(NEW.knowledge_delta, 0))
  THEN pillar_name := 'Drive'; delta_value := NEW.drive_delta;
  ELSIF ABS(COALESCE(NEW.computational_power_delta, 0)) >= ABS(COALESCE(NEW.communication_delta, 0))
     AND ABS(COALESCE(NEW.computational_power_delta, 0)) >= ABS(COALESCE(NEW.creativity_delta, 0))
     AND ABS(COALESCE(NEW.computational_power_delta, 0)) >= ABS(COALESCE(NEW.knowledge_delta, 0))
  THEN pillar_name := 'Computational Power'; delta_value := NEW.computational_power_delta;
  ELSIF ABS(COALESCE(NEW.communication_delta, 0)) >= ABS(COALESCE(NEW.creativity_delta, 0))
     AND ABS(COALESCE(NEW.communication_delta, 0)) >= ABS(COALESCE(NEW.knowledge_delta, 0))
  THEN pillar_name := 'Communication'; delta_value := NEW.communication_delta;
  ELSIF ABS(COALESCE(NEW.creativity_delta, 0)) >= ABS(COALESCE(NEW.knowledge_delta, 0))
  THEN pillar_name := 'Creativity'; delta_value := NEW.creativity_delta;
  ELSE pillar_name := 'Knowledge'; delta_value := NEW.knowledge_delta;
  END IF;
  IF ABS(COALESCE(delta_value, 0)) >= 1 THEN
    INSERT INTO feed_items (user_id, feed_type, title, body, icon, metadata, priority)
    VALUES (NEW.user_id, 'trajectory_update',
      CASE WHEN delta_value > 0 THEN pillar_name || ' +' || delta_value::TEXT ELSE pillar_name || ' ' || delta_value::TEXT END,
      CASE WHEN delta_value > 0 THEN 'Your ' || pillar_name || ' pillar grew by ' || delta_value::TEXT || ' points' ELSE 'Your ' || pillar_name || ' shifted by ' || delta_value::TEXT || ' points' END,
      CASE WHEN delta_value > 0 THEN 'trending-up' ELSE 'trending-down' END,
      jsonb_build_object('pillar', pillar_name, 'delta', delta_value, 'source', NEW.source_type),
      CASE WHEN ABS(delta_value) >= 3 THEN 2 ELSE 1 END);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'feed_on_trajectory_update failed: %', SQLERRM; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_feed_trajectory ON pillar_trajectory_log;
CREATE TRIGGER trg_feed_trajectory AFTER INSERT ON pillar_trajectory_log FOR EACH ROW EXECUTE FUNCTION feed_on_trajectory_update();

-- 2. GROWTH TEST trigger
CREATE OR REPLACE FUNCTION feed_on_growth_test()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('test_passed', 'test_failed') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
    VALUES (NEW.user_id, 'growth_test_result',
      CASE WHEN NEW.test_passed THEN 'Test Passed!' ELSE 'Test Completed' END,
      'You scored ' || COALESCE(NEW.test_score, 0)::TEXT || '/100 on ' || COALESCE(NEW.resource_title, 'a course'),
      CASE WHEN NEW.test_passed THEN 'check-circle' ELSE 'refresh-cw' END,
      '/growth-hub', CASE WHEN NEW.test_passed THEN 'View Growth Path' ELSE 'Retake Test' END,
      jsonb_build_object('score', NEW.test_score, 'passed', NEW.test_passed, 'resource', NEW.resource_title, 'pillar', NEW.primary_pillar),
      CASE WHEN NEW.test_passed THEN 2 ELSE 1 END);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'feed_on_growth_test failed: %', SQLERRM; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_feed_growth_test ON growth_hub_progress;
CREATE TRIGGER trg_feed_growth_test AFTER UPDATE ON growth_hub_progress FOR EACH ROW EXECUTE FUNCTION feed_on_growth_test();

-- 3. CHALLENGE INVITATION trigger
CREATE OR REPLACE FUNCTION feed_on_challenge_invitation()
RETURNS trigger AS $$
DECLARE company TEXT; role TEXT;
BEGIN
  SELECT bp.company_name INTO company FROM business_profiles bp WHERE bp.user_id = NEW.business_id;
  SELECT hg.role_title INTO role FROM hiring_goal_drafts hg WHERE hg.id = NEW.hiring_goal_id;
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, actor_type, actor_name, metadata, priority)
  SELECT p.user_id, 'challenge_invitation',
    COALESCE(company, 'A company') || ' invited you!',
    'You''ve been invited to a challenge' || CASE WHEN role IS NOT NULL THEN ' for ' || role ELSE '' END || '.',
    'zap', '/challenges', 'View Challenge', 'company', company,
    jsonb_build_object('company', company, 'role', role, 'invitation_id', NEW.id), 3
  FROM profiles p WHERE p.id = NEW.candidate_profile_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'feed_on_challenge_invitation failed: %', SQLERRM; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_feed_challenge_inv ON challenge_invitations;
CREATE TRIGGER trg_feed_challenge_inv AFTER INSERT ON challenge_invitations FOR EACH ROW EXECUTE FUNCTION feed_on_challenge_invitation();

-- 4. CV ANALYSIS trigger
CREATE OR REPLACE FUNCTION feed_on_cv_analysis()
RETURNS trigger AS $$
BEGIN
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (NEW.user_id, 'milestone', 'CV Analysis Complete',
    'Your CV has been analyzed and your identity tension map is ready.',
    'file-text', '/profile', 'View Analysis',
    jsonb_build_object('alignment_score', NEW.alignment_score, 'cv_archetype', NEW.cv_archetype_primary), 2);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'feed_on_cv_analysis failed: %', SQLERRM; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_feed_cv_analysis ON cv_identity_analysis;
CREATE TRIGGER trg_feed_cv_analysis AFTER INSERT ON cv_identity_analysis FOR EACH ROW EXECUTE FUNCTION feed_on_cv_analysis();

-- 5. ASSESSMENT COMPLETE trigger
CREATE OR REPLACE FUNCTION feed_on_assessment_complete()
RETURNS trigger AS $$
DECLARE ximatar_label TEXT;
BEGIN
  SELECT x.label INTO ximatar_label FROM ximatars x WHERE x.id = NEW.ximatar_id;
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (NEW.user_id, 'milestone',
    'Welcome, ' || COALESCE(ximatar_label, 'Explorer') || '!',
    'Your XIMAtar has been revealed! Upload your CV to discover your identity tension.',
    'star', '/profile', 'Upload CV',
    jsonb_build_object('ximatar', ximatar_label, 'ximatar_id', NEW.ximatar_id), 3);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'feed_on_assessment_complete failed: %', SQLERRM; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_feed_assessment ON assessment_results;
CREATE TRIGGER trg_feed_assessment AFTER INSERT ON assessment_results FOR EACH ROW EXECUTE FUNCTION feed_on_assessment_complete();

-- 6. GROWTH PATH trigger
CREATE OR REPLACE FUNCTION feed_on_growth_path()
RETURNS trigger AS $$
BEGIN
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (NEW.user_id, 'growth_recommendation',
    'New Growth Path: ' || COALESCE(NEW.path_title, 'Personalized Learning'),
    'AI has curated resources targeting your ' || COALESCE(NEW.target_pillar, 'weakest') || ' pillar.',
    'book-open', '/growth-hub', 'Start Learning',
    jsonb_build_object('target_pillar', NEW.target_pillar, 'path_title', NEW.path_title), 2);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'feed_on_growth_path failed: %', SQLERRM; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_feed_growth_path ON growth_paths;
CREATE TRIGGER trg_feed_growth_path AFTER INSERT ON growth_paths FOR EACH ROW EXECUTE FUNCTION feed_on_growth_path();

-- Seed welcome items for existing users
INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, priority, created_at)
SELECT p.user_id, 'milestone', 'Welcome to XIMA!',
  'Your XIMAtar profile is ready. Explore your Growth Hub to start developing your weakest pillars.',
  'star', '/growth-hub', 'Explore Growth Hub', 2, COALESCE(p.created_at, now())
FROM profiles p
WHERE p.user_id IS NOT NULL AND p.pillar_scores IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM feed_items fi WHERE fi.user_id = p.user_id AND fi.feed_type = 'milestone')
ON CONFLICT DO NOTHING;
