-- Create external content table
CREATE TABLE IF NOT EXISTS feed_external_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  image_url TEXT,
  content_type TEXT DEFAULT 'article',
  target_archetypes TEXT[] DEFAULT '{}',
  target_pillars TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  is_sponsored BOOLEAN DEFAULT false,
  sponsor_name TEXT,
  sponsor_logo_url TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days',
  priority INTEGER DEFAULT 1,
  engagement_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_content_active ON feed_external_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_content_archetypes ON feed_external_content USING gin(target_archetypes);
CREATE INDEX IF NOT EXISTS idx_external_content_pillars ON feed_external_content USING gin(target_pillars);

ALTER TABLE feed_external_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read external content" ON feed_external_content;
CREATE POLICY "Anyone can read external content" ON feed_external_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manages content" ON feed_external_content;
CREATE POLICY "Service role manages content" ON feed_external_content FOR ALL USING (true) WITH CHECK (true);

-- Engagement tracking RPC
CREATE OR REPLACE FUNCTION increment_engagement(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE feed_external_content SET engagement_count = engagement_count + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger functions for storytelling tone

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
    VALUES (
      NEW.user_id, 'trajectory_update',
      CASE WHEN delta_value > 0 THEN pillar_name || ' +' || delta_value::TEXT ELSE pillar_name || ' ' || delta_value::TEXT END,
      CASE WHEN delta_value > 0 
        THEN 'Great progress! Your ' || pillar_name || ' pillar grew by ' || delta_value::TEXT || ' points. Every step counts toward evolving your XIMAtar.'
        ELSE 'Your ' || pillar_name || ' showed a shift of ' || delta_value::TEXT || ' points. Growth isn''t always linear — keep pushing forward.'
      END,
      CASE WHEN delta_value > 0 THEN 'trending-up' ELSE 'trending-down' END,
      jsonb_build_object('pillar', pillar_name, 'delta', delta_value, 'source', NEW.source_type),
      CASE WHEN ABS(delta_value) >= 3 THEN 2 ELSE 1 END
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_trajectory_update failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION feed_on_growth_test()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('test_passed', 'test_failed') AND OLD.status != NEW.status THEN
    INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
    VALUES (
      NEW.user_id, 'growth_test_result',
      CASE WHEN NEW.test_passed THEN 'Test Passed!' ELSE 'Test Completed' END,
      CASE WHEN NEW.test_passed 
        THEN 'Congratulations! You scored ' || COALESCE(NEW.test_score, 0)::TEXT || '/100 on "' || COALESCE(NEW.resource_title, 'your course') || '". Your pillar scores have been updated — check your profile to see the impact!'
        ELSE 'You scored ' || COALESCE(NEW.test_score, 0)::TEXT || '/100 on "' || COALESCE(NEW.resource_title, 'your course') || '". You need 60 to pass — review the material and try again. Growth takes practice.'
      END,
      CASE WHEN NEW.test_passed THEN 'check-circle' ELSE 'refresh-cw' END,
      '/growth-hub',
      CASE WHEN NEW.test_passed THEN 'View Growth Path' ELSE 'Retake Test' END,
      jsonb_build_object('score', NEW.test_score, 'passed', NEW.test_passed, 'resource', NEW.resource_title, 'pillar', NEW.primary_pillar),
      CASE WHEN NEW.test_passed THEN 2 ELSE 1 END
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_growth_test failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION feed_on_challenge_invitation()
RETURNS trigger AS $$
DECLARE
  company TEXT;
  role TEXT;
BEGIN
  SELECT bp.company_name INTO company FROM business_profiles bp WHERE bp.user_id = NEW.business_id;
  SELECT hg.role_title INTO role FROM hiring_goal_drafts hg WHERE hg.id = NEW.hiring_goal_id;

  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, actor_type, actor_name, metadata, priority)
  SELECT 
    p.user_id, 'challenge_invitation',
    COALESCE(company, 'A company') || ' invited you!',
    'Exciting news! ' || COALESCE(company, 'A company') || ' thinks your profile matches what they''re looking for' || 
    CASE WHEN role IS NOT NULL THEN ' for their ' || role || ' position' ELSE '' END || 
    '. This is your chance to showcase your XIMAtar in action.',
    'zap', '/challenges', 'View Challenge', 'company', company,
    jsonb_build_object('company', company, 'role', role, 'invitation_id', NEW.id), 3
  FROM profiles p WHERE p.id = NEW.candidate_profile_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_challenge_invitation failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION feed_on_assessment_complete()
RETURNS trigger AS $$
DECLARE
  ximatar_label TEXT;
BEGIN
  SELECT x.label INTO ximatar_label FROM ximatars x WHERE x.id = NEW.ximatar_id;
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (
    NEW.user_id, 'milestone',
    'Welcome, ' || COALESCE(ximatar_label, 'Explorer') || '!',
    'Your XIMAtar has been revealed! Upload your CV to discover the tension between your identity and how you present yourself.',
    'star', '/profile', 'Upload CV',
    jsonb_build_object('ximatar', ximatar_label, 'ximatar_id', NEW.ximatar_id), 3
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_assessment_complete failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION feed_on_cv_analysis()
RETURNS trigger AS $$
BEGIN
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (
    NEW.user_id, 'milestone', 'CV Analysis Complete',
    'Your CV has been analyzed and your identity tension map is ready. See how your CV represents your true professional identity.',
    'file-text', '/profile', 'View Analysis',
    jsonb_build_object('alignment_score', NEW.alignment_score, 'cv_archetype', NEW.cv_archetype_primary), 2
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_cv_analysis failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION feed_on_growth_path()
RETURNS trigger AS $$
BEGIN
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (
    NEW.user_id, 'growth_recommendation',
    'New Growth Path: ' || COALESCE(NEW.path_title, 'Personalized Learning'),
    'AI has curated courses, books, and podcasts targeting your ' || COALESCE(NEW.target_pillar, 'weakest') || ' pillar. Start learning to grow your XIMAtar.',
    'book-open', '/growth-hub', 'Start Learning',
    jsonb_build_object('target_pillar', NEW.target_pillar, 'path_title', NEW.path_title), 2
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_growth_path failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;