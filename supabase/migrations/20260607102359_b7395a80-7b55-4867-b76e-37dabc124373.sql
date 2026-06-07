CREATE OR REPLACE FUNCTION public.enforce_pipeline_progression()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  challenge_rubric JSONB;
  challenge_title TEXT;
  challenge_level_col INT;
  challenge_level INT;
  l1_submitted BOOLEAN;
  l1_reviewed_proceed BOOLEAN;
  l2_submitted BOOLEAN;
  l2_reviewed_proceed BOOLEAN;
BEGIN
  SELECT rubric, title, level
    INTO challenge_rubric, challenge_title, challenge_level_col
  FROM public.business_challenges WHERE id = NEW.challenge_id;

  -- Authoritative: business_challenges.level column wins when populated.
  -- Fallback: legacy rubric/title heuristic for rows without an explicit level.
  IF challenge_level_col IN (1, 2, 3) THEN
    challenge_level := challenge_level_col;
  ELSIF challenge_rubric->>'type' = 'xima_core'
     OR (challenge_rubric->>'isXimaCore')::boolean = true
     OR challenge_rubric->>'level' = '1'
     OR pg_catalog.lower(challenge_title) LIKE '%xima core%' THEN
    challenge_level := 1;
  ELSIF challenge_rubric->>'type' IN ('standing_presence', 'video')
     OR challenge_rubric->>'level' = '3' THEN
    challenge_level := 3;
  ELSE
    challenge_level := 2;
  END IF;

  IF challenge_level = 1 THEN RETURN NEW; END IF;

  IF challenge_level = 2 THEN
    -- Gate A: candidate must have a SUBMITTED L1 submission for this goal.
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_submissions cs
      JOIN public.challenge_invitations ci ON ci.id = cs.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (
          bc.level = 1
          OR (bc.level IS NULL AND (
            bc.rubric->>'type' = 'xima_core'
            OR (bc.rubric->>'isXimaCore')::boolean = true
            OR bc.rubric->>'level' = '1'
            OR pg_catalog.lower(bc.title) LIKE '%xima core%'
          ))
        )
        AND cs.status = 'submitted'
    ) INTO l1_submitted;

    IF NOT l1_submitted THEN
      RAISE EXCEPTION 'pipeline_locked: Level 1 submission required';
    END IF;

    -- Gate B: business must have recorded a proceed_level2 review on the L1 invitation.
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_reviews cr
      JOIN public.challenge_invitations ci ON ci.id = cr.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (
          bc.level = 1
          OR (bc.level IS NULL AND (
            bc.rubric->>'type' = 'xima_core'
            OR (bc.rubric->>'isXimaCore')::boolean = true
            OR bc.rubric->>'level' = '1'
            OR pg_catalog.lower(bc.title) LIKE '%xima core%'
          ))
        )
        AND cr.decision = 'proceed_level2'
    ) INTO l1_reviewed_proceed;

    IF NOT l1_reviewed_proceed THEN
      RAISE EXCEPTION 'pipeline_locked: Business must select Proceed to Level 2';
    END IF;

    RETURN NEW;
  END IF;

  IF challenge_level = 3 THEN
    -- Gate A: candidate must have a SUBMITTED L2 submission for this goal.
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_submissions cs
      JOIN public.challenge_invitations ci ON ci.id = cs.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (
          bc.level = 2
          OR (bc.level IS NULL AND NOT (
            bc.rubric->>'type' IN ('xima_core', 'standing_presence', 'video')
            OR (bc.rubric->>'isXimaCore')::boolean = true
            OR bc.rubric->>'level' IN ('1', '3')
            OR pg_catalog.lower(bc.title) LIKE '%xima core%'
          ))
        )
        AND cs.status = 'submitted'
    ) INTO l2_submitted;

    IF NOT l2_submitted THEN
      RAISE EXCEPTION 'pipeline_locked: Level 2 submission required';
    END IF;

    -- Gate B: business must have recorded a proceed_level3 review on the L2 invitation.
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_reviews cr
      JOIN public.challenge_invitations ci ON ci.id = cr.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (
          bc.level = 2
          OR (bc.level IS NULL AND NOT (
            bc.rubric->>'type' IN ('xima_core', 'standing_presence', 'video')
            OR (bc.rubric->>'isXimaCore')::boolean = true
            OR bc.rubric->>'level' IN ('1', '3')
            OR pg_catalog.lower(bc.title) LIKE '%xima core%'
          ))
        )
        AND cr.decision = 'proceed_level3'
    ) INTO l2_reviewed_proceed;

    IF NOT l2_reviewed_proceed THEN
      RAISE EXCEPTION 'pipeline_locked: Business must select Proceed to Level 3';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;