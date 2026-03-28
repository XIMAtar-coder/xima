-- Update growth path trigger with better storytelling + "Go to the Hub" label
CREATE OR REPLACE FUNCTION feed_on_growth_path()
RETURNS trigger AS $$
BEGIN
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
  VALUES (
    NEW.user_id,
    'growth_recommendation',
    'Your Growth Path is Ready',
    'A personalized learning path with courses, books, and podcasts is waiting for you. Each resource targets your ' || COALESCE(NEW.target_pillar, 'growth') || ' pillar — complete them and take the tests to grow your XIMAtar.',
    'book-open',
    '/growth-hub',
    'Go to the Hub',
    jsonb_build_object('target_pillar', NEW.target_pillar, 'path_title', NEW.path_title),
    2
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_growth_path failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update growth test trigger with "Go to the Hub" label
CREATE OR REPLACE FUNCTION feed_on_growth_test()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('test_passed', 'test_failed') AND OLD.status != NEW.status THEN
    INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, metadata, priority)
    VALUES (
      NEW.user_id,
      'growth_test_result',
      CASE WHEN NEW.test_passed THEN 'Test Passed!' ELSE 'Test Completed' END,
      CASE WHEN NEW.test_passed 
        THEN 'Congratulations! You scored ' || COALESCE(NEW.test_score, 0)::TEXT || '/100 on "' || COALESCE(NEW.resource_title, 'your course') || '". Your pillar scores have been updated — check your profile to see the impact!'
        ELSE 'You scored ' || COALESCE(NEW.test_score, 0)::TEXT || '/100 on "' || COALESCE(NEW.resource_title, 'your course') || '". You need 60 to pass — review the material and try again. Growth takes practice.'
      END,
      CASE WHEN NEW.test_passed THEN 'check-circle' ELSE 'refresh-cw' END,
      '/growth-hub',
      'Go to the Hub',
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

-- Update existing feed items: all Growth Hub action buttons → "Go to the Hub"
UPDATE feed_items 
SET action_label = 'Go to the Hub' 
WHERE feed_type IN ('growth_recommendation', 'growth_test_result', 'milestone') 
  AND action_url = '/growth-hub';

-- Update welcome milestone items with better text
UPDATE feed_items 
SET 
  body = 'Your XIMAtar profile is ready. Start your growth journey — courses, books, and podcasts curated for your unique profile are waiting in the Hub.',
  action_label = 'Go to the Hub'
WHERE feed_type = 'milestone' 
  AND title ILIKE '%Welcome%' 
  AND action_url = '/growth-hub';