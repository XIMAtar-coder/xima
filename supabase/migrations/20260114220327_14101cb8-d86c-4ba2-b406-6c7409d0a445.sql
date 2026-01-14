-- ================================================================
-- FEED SIGNAL EMISSION SYSTEM
-- Automatically generates anonymized feed items from verified events
-- ================================================================

-- 1. Core emit_feed_signal function with deduplication
CREATE OR REPLACE FUNCTION public.emit_feed_signal(
  p_type text,
  p_source text,
  p_subject_ximatar_id uuid,
  p_payload jsonb,
  p_visibility jsonb DEFAULT '{"public": true}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload_hash text;
  existing_id uuid;
  new_id uuid;
BEGIN
  -- Generate a hash for deduplication (type + ximatar + core payload elements)
  payload_hash := encode(
    sha256(
      (p_type || p_subject_ximatar_id::text || COALESCE(p_payload->>'level', '') || COALESCE(p_payload->>'challenge_id', '') || COALESCE(p_payload->>'skill', ''))::bytea
    ),
    'hex'
  );
  
  -- Check for duplicate within last 24 hours
  SELECT id INTO existing_id
  FROM public.feed_items
  WHERE type = p_type
    AND subject_ximatar_id = p_subject_ximatar_id
    AND created_at > (now() - interval '24 hours')
    AND payload->>'_hash' = payload_hash
  LIMIT 1;
  
  -- Skip if duplicate exists
  IF existing_id IS NOT NULL THEN
    RAISE NOTICE 'Duplicate feed signal skipped: type=%, ximatar=%', p_type, p_subject_ximatar_id;
    RETURN existing_id;
  END IF;
  
  -- Insert new feed item with hash for future dedup
  INSERT INTO public.feed_items (type, source, subject_ximatar_id, payload, visibility)
  VALUES (
    p_type,
    p_source,
    p_subject_ximatar_id,
    p_payload || jsonb_build_object('_hash', payload_hash),
    p_visibility
  )
  RETURNING id INTO new_id;
  
  RAISE NOTICE 'Feed signal emitted: id=%, type=%, ximatar=%', new_id, p_type, p_subject_ximatar_id;
  RETURN new_id;
END;
$$;

-- 2. Trigger for Level 2 Challenge Completion
CREATE OR REPLACE FUNCTION public.emit_challenge_completed_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_ximatar_id uuid;
  challenge_level int;
  ximatar_name text;
  ximatar_image text;
BEGIN
  -- Only trigger when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    
    -- Get challenge level from business_challenges
    SELECT COALESCE(bc.level, 2) INTO challenge_level
    FROM public.business_challenges bc
    WHERE bc.id = NEW.challenge_id;
    
    -- Only emit for Level 2+ challenges
    IF challenge_level >= 2 THEN
      -- Get candidate's ximatar_id from profiles via candidate_profile_id
      SELECT p.ximatar_id, x.label, x.image_url
      INTO candidate_ximatar_id, ximatar_name, ximatar_image
      FROM public.profiles p
      LEFT JOIN public.ximatars x ON x.id = p.ximatar_id
      WHERE p.id = NEW.candidate_profile_id;
      
      -- Only emit if candidate has a ximatar assigned
      IF candidate_ximatar_id IS NOT NULL THEN
        PERFORM public.emit_feed_signal(
          'challenge_completed',
          'candidate',
          candidate_ximatar_id,
          jsonb_build_object(
            'level', challenge_level,
            'challenge_id', NEW.challenge_id,
            'normalized_text', 'Completed a Level ' || challenge_level || ' challenge',
            'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'),
            'ximatar_image', ximatar_image
          ),
          jsonb_build_object('public', true)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_challenge_completed ON public.challenge_submissions;
CREATE TRIGGER trg_emit_challenge_completed
  AFTER INSERT OR UPDATE ON public.challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_challenge_completed_signal();

-- 3. Trigger for Skill Validation (on assessment completion)
CREATE OR REPLACE FUNCTION public.emit_skill_validated_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_ximatar_id uuid;
  ximatar_name text;
  ximatar_image text;
  top_pillar text;
  top_score numeric;
  skill_name text;
BEGIN
  -- Only trigger when assessment is completed
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    
    -- Get ximatar info
    SELECT p.ximatar_id, x.label, x.image_url
    INTO candidate_ximatar_id, ximatar_name, ximatar_image
    FROM public.profiles p
    LEFT JOIN public.ximatars x ON x.id = p.ximatar_id
    WHERE p.user_id = NEW.user_id;
    
    IF candidate_ximatar_id IS NOT NULL THEN
      -- Get top pillar from pillar_scores
      SELECT pillar, score INTO top_pillar, top_score
      FROM public.pillar_scores
      WHERE assessment_result_id = NEW.id
      ORDER BY score DESC
      LIMIT 1;
      
      -- Map pillar to skill name
      skill_name := CASE top_pillar
        WHEN 'computational_power' THEN 'Analytical Thinking'
        WHEN 'communication' THEN 'Communication'
        WHEN 'knowledge' THEN 'Domain Expertise'
        WHEN 'creativity' THEN 'Creative Problem Solving'
        WHEN 'drive' THEN 'Execution & Drive'
        ELSE 'Professional Skill'
      END;
      
      -- Emit skill validation signal
      PERFORM public.emit_feed_signal(
        'skill_validated',
        'system',
        candidate_ximatar_id,
        jsonb_build_object(
          'skill', skill_name,
          'score', top_score,
          'normalized_text', 'Validated skill: ' || skill_name,
          'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'),
          'ximatar_image', ximatar_image,
          'skill_tags', jsonb_build_array(skill_name)
        ),
        jsonb_build_object('public', true)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_skill_validated ON public.assessment_results;
CREATE TRIGGER trg_emit_skill_validated
  AFTER UPDATE ON public.assessment_results
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_skill_validated_signal();

-- 4. Trigger for Level Reached (on challenge progression)
CREATE OR REPLACE FUNCTION public.emit_level_reached_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_ximatar_id uuid;
  ximatar_name text;
  ximatar_image text;
  previous_max_level int;
  new_level int;
BEGIN
  -- Only trigger on proceed decisions
  IF NEW.decision IN ('proceed_level2', 'proceed_level3', 'shortlist') THEN
    
    -- Determine the new level based on decision
    new_level := CASE NEW.decision
      WHEN 'proceed_level2' THEN 2
      WHEN 'proceed_level3' THEN 3
      WHEN 'shortlist' THEN 4  -- Shortlist = "final stage"
      ELSE 2
    END;
    
    -- Get candidate's ximatar from invitation
    SELECT p.ximatar_id, x.label, x.image_url
    INTO candidate_ximatar_id, ximatar_name, ximatar_image
    FROM public.challenge_invitations ci
    JOIN public.profiles p ON p.id = ci.candidate_profile_id
    LEFT JOIN public.ximatars x ON x.id = p.ximatar_id
    WHERE ci.id = NEW.invitation_id;
    
    IF candidate_ximatar_id IS NOT NULL THEN
      PERFORM public.emit_feed_signal(
        'level_reached',
        'system',
        candidate_ximatar_id,
        jsonb_build_object(
          'level', new_level,
          'normalized_text', CASE new_level
            WHEN 2 THEN 'Advanced to Level 2 evaluation'
            WHEN 3 THEN 'Advanced to Level 3 evaluation'
            WHEN 4 THEN 'Reached final selection stage'
            ELSE 'Progressed to next stage'
          END,
          'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'),
          'ximatar_image', ximatar_image
        ),
        jsonb_build_object('public', true)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_level_reached ON public.challenge_reviews;
CREATE TRIGGER trg_emit_level_reached
  AFTER INSERT ON public.challenge_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_level_reached_signal();

-- 5. Function to aggregate and emit interest signals (called periodically or on threshold)
CREATE OR REPLACE FUNCTION public.emit_interest_aggregated_signal(
  p_subject_ximatar_id uuid,
  p_interest_count int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ximatar_name text;
  ximatar_image text;
BEGIN
  -- Only emit if count is meaningful (>= 3)
  IF p_interest_count < 3 THEN
    RETURN NULL;
  END IF;
  
  -- Get ximatar info
  SELECT label, image_url INTO ximatar_name, ximatar_image
  FROM public.ximatars
  WHERE id = p_subject_ximatar_id;
  
  RETURN public.emit_feed_signal(
    'interest_aggregated',
    'business',
    p_subject_ximatar_id,
    jsonb_build_object(
      'count', p_interest_count,
      'normalized_text', p_interest_count || ' companies showed interest in this profile',
      'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'),
      'ximatar_image', ximatar_image
    ),
    jsonb_build_object('public', true)
  );
END;
$$;

-- 6. Trigger to aggregate interest from shortlists (batch emission)
CREATE OR REPLACE FUNCTION public.check_and_emit_interest_aggregated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_ximatar_id uuid;
  interest_count int;
BEGIN
  -- Get ximatar for this candidate
  SELECT p.ximatar_id INTO candidate_ximatar_id
  FROM public.profiles p
  WHERE p.id = NEW.candidate_profile_id;
  
  IF candidate_ximatar_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count total business interest (shortlists + interested reactions)
  SELECT COUNT(DISTINCT business_id) INTO interest_count
  FROM public.business_shortlists
  WHERE candidate_profile_id = NEW.candidate_profile_id;
  
  -- Emit aggregated signal if threshold met
  IF interest_count >= 3 THEN
    PERFORM public.emit_interest_aggregated_signal(candidate_ximatar_id, interest_count);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_interest_aggregated ON public.business_shortlists;
CREATE TRIGGER trg_check_interest_aggregated
  AFTER INSERT ON public.business_shortlists
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_emit_interest_aggregated();

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.emit_feed_signal TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_interest_aggregated_signal TO authenticated;