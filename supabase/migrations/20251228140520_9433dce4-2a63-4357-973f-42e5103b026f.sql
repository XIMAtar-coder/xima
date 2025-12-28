-- Fix the pipeline enforcement trigger to properly detect Level 1 XIMA Core challenges
-- The current trigger only checks rubric->>'type' = 'xima_core' but challenges may use:
-- - rubric->>'isXimaCore' = 'true'
-- - rubric->>'level' = '1'
-- - title containing 'XIMA Core'

CREATE OR REPLACE FUNCTION public.enforce_pipeline_progression()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  challenge_rubric JSONB;
  challenge_title TEXT;
  challenge_level INT;
  l1_submitted BOOLEAN;
  l1_reviewed_proceed BOOLEAN;
BEGIN
  -- Get the challenge's rubric and title to determine level
  SELECT rubric, title INTO challenge_rubric, challenge_title
  FROM public.business_challenges 
  WHERE id = NEW.challenge_id;
  
  -- Determine level from rubric (check multiple fields) or title fallback
  IF challenge_rubric->>'type' = 'xima_core' 
     OR (challenge_rubric->>'isXimaCore')::boolean = true 
     OR challenge_rubric->>'level' = '1'
     OR LOWER(challenge_title) LIKE '%xima core%' THEN
    challenge_level := 1;
  ELSIF challenge_rubric->>'type' IN ('standing_presence', 'video') THEN
    challenge_level := 3;
  ELSE
    challenge_level := 2; -- default: role-specific
  END IF;
  
  -- Level 1: always allowed (this is the entry point)
  IF challenge_level = 1 THEN
    RETURN NEW;
  END IF;
  
  -- Level 2: Require L1 submitted + proceed_level2 review
  IF challenge_level = 2 THEN
    -- Check for L1 submission with status='submitted'
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_submissions cs
      JOIN public.challenge_invitations ci ON ci.id = cs.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (
          bc.rubric->>'type' = 'xima_core' 
          OR (bc.rubric->>'isXimaCore')::boolean = true 
          OR bc.rubric->>'level' = '1'
          OR LOWER(bc.title) LIKE '%xima core%'
        )
        AND cs.status = 'submitted'
    ) INTO l1_submitted;
    
    IF NOT l1_submitted THEN
      RAISE EXCEPTION 'pipeline_locked: Level 1 (XIMA Core) submission required before Level 2';
    END IF;
    
    -- Check for proceed_level2 review decision
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_reviews cr
      JOIN public.challenge_invitations ci ON ci.id = cr.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (
          bc.rubric->>'type' = 'xima_core' 
          OR (bc.rubric->>'isXimaCore')::boolean = true 
          OR bc.rubric->>'level' = '1'
          OR LOWER(bc.title) LIKE '%xima core%'
        )
        AND cr.decision = 'proceed_level2'
    ) INTO l1_reviewed_proceed;
    
    IF NOT l1_reviewed_proceed THEN
      RAISE EXCEPTION 'pipeline_locked: Business must first select "Proceed to Level 2" for this candidate';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Level 3: Require L2 submitted + proceed_level3 review (future)
  IF challenge_level = 3 THEN
    -- For now, just allow Level 3 (can be extended later)
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;