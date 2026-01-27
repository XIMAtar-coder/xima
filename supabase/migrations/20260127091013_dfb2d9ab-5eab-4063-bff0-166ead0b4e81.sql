-- BATCH 3: Assessment and trigger functions (10 functions)
-- Hardened SECURITY DEFINER: fixed search_path = pg_catalog, public (2026-01-27)

-- 21. on_assessment_complete
CREATE OR REPLACE FUNCTION public.on_assessment_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at != NEW.completed_at) THEN
    PERFORM public.recompute_user_scores(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 22. on_assessment_finished
CREATE OR REPLACE FUNCTION public.on_assessment_finished()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
begin
  if new.completed_at is not null and (old.completed_at is null or old.completed_at != new.completed_at) then
    perform public.assign_ximatar(new.user_id, new.id);
  end if;
  return new;
end;
$function$;

-- 23. on_assessment_completed_trigger
CREATE OR REPLACE FUNCTION public.on_assessment_completed_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    DECLARE
      answer_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO answer_count
      FROM public.assessment_answers
      WHERE result_id = NEW.id;
      
      IF answer_count = 0 THEN
        RETURN NEW;
      END IF;
    END;
    
    PERFORM public.compute_pillar_scores_from_assessment(NEW.id);
    PERFORM public.assign_ximatar_by_pillars(NEW.id);
    PERFORM public.log_user_activity('assessment_computed', pg_catalog.jsonb_build_object('result_id', NEW.id, 'timestamp', pg_catalog.now()));
  END IF;
  RETURN NEW;
END;
$function$;

-- 24. on_user_scores_update
CREATE OR REPLACE FUNCTION public.on_user_scores_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  PERFORM public.recompute_matches(NEW.user_id);
  RETURN NEW;
END;
$function$;

-- 25. enforce_pipeline_progression
CREATE OR REPLACE FUNCTION public.enforce_pipeline_progression()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  challenge_rubric JSONB;
  challenge_title TEXT;
  challenge_level INT;
  l1_submitted BOOLEAN;
  l1_reviewed_proceed BOOLEAN;
BEGIN
  SELECT rubric, title INTO challenge_rubric, challenge_title
  FROM public.business_challenges WHERE id = NEW.challenge_id;
  
  IF challenge_rubric->>'type' = 'xima_core' 
     OR (challenge_rubric->>'isXimaCore')::boolean = true 
     OR challenge_rubric->>'level' = '1'
     OR pg_catalog.lower(challenge_title) LIKE '%xima core%' THEN
    challenge_level := 1;
  ELSIF challenge_rubric->>'type' IN ('standing_presence', 'video') THEN
    challenge_level := 3;
  ELSE
    challenge_level := 2;
  END IF;
  
  IF challenge_level = 1 THEN RETURN NEW; END IF;
  
  IF challenge_level = 2 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_submissions cs
      JOIN public.challenge_invitations ci ON ci.id = cs.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (bc.rubric->>'type' = 'xima_core' OR (bc.rubric->>'isXimaCore')::boolean = true OR bc.rubric->>'level' = '1' OR pg_catalog.lower(bc.title) LIKE '%xima core%')
        AND cs.status = 'submitted'
    ) INTO l1_submitted;
    
    IF NOT l1_submitted THEN
      RAISE EXCEPTION 'pipeline_locked: Level 1 submission required';
    END IF;
    
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_reviews cr
      JOIN public.challenge_invitations ci ON ci.id = cr.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (bc.rubric->>'type' = 'xima_core' OR (bc.rubric->>'isXimaCore')::boolean = true OR bc.rubric->>'level' = '1' OR pg_catalog.lower(bc.title) LIKE '%xima core%')
        AND cr.decision = 'proceed_level2'
    ) INTO l1_reviewed_proceed;
    
    IF NOT l1_reviewed_proceed THEN
      RAISE EXCEPTION 'pipeline_locked: Business must select Proceed to Level 2';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 26. trg_auto_record_business_interest
CREATE OR REPLACE FUNCTION public.trg_auto_record_business_interest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;

-- 27. delete_user_account
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  calling_user_id uuid;
  is_admin boolean;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  SELECT public.has_role(calling_user_id, 'admin') INTO is_admin;
  
  IF calling_user_id != p_user_id AND NOT COALESCE(is_admin, false) THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  UPDATE public.chat_messages SET sender_id = NULL, body = '[deleted]'
  WHERE sender_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  
  UPDATE public.activity_logs SET user_id = NULL, context = pg_catalog.jsonb_build_object('anonymized', true)
  WHERE user_id = p_user_id;
  
  UPDATE public.challenge_submissions SET submitted_payload = pg_catalog.jsonb_build_object('anonymized', true)
  WHERE candidate_profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  
  DELETE FROM public.feed_consumption WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.feed_seen_items WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.chat_participants WHERE user_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.ai_conversations WHERE user_id = p_user_id;
  DELETE FROM public.cv_uploads WHERE user_id = p_user_id;
  DELETE FROM public.assessment_results WHERE user_id = p_user_id;
  DELETE FROM public.user_consents WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  RETURN pg_catalog.jsonb_build_object('success', true, 'message', 'Account data deleted');
END;
$function$;

-- 28. add_feed_reaction
CREATE OR REPLACE FUNCTION public.add_feed_reaction(p_feed_item_id uuid, p_reaction_type text, p_reactor_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_hash text;
BEGIN
  v_hash := pg_catalog.encode(pg_catalog.sha256((auth.uid()::text || p_feed_item_id::text || 'xima_salt')::bytea), 'hex');
  
  INSERT INTO public.feed_reactions (feed_item_id, reactor_type, reaction_type, reactor_hash)
  VALUES (p_feed_item_id, p_reactor_type, p_reaction_type, v_hash)
  ON CONFLICT (feed_item_id, reactor_hash, reaction_type) DO NOTHING;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$function$;

-- 29. recompute_user_scores
CREATE OR REPLACE FUNCTION public.recompute_user_scores(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  latest uuid;
  comp numeric; comm numeric; know numeric; crea numeric; drv numeric;
  best public.ximatar_type;
BEGIN
  SELECT a.id INTO latest FROM public.assessments a
  WHERE a.user_id = p_user AND a.completed_at IS NOT NULL
  ORDER BY a.completed_at DESC LIMIT 1;

  IF latest IS NULL THEN
    INSERT INTO public.user_scores (user_id, assessments_completed, updated_at)
    VALUES (p_user, 0, pg_catalog.now())
    ON CONFLICT (user_id) DO UPDATE SET computational_power=0, communication=0, knowledge=0, creativity=0, drive=0, assessments_completed=0, match_quality_pct=0, updated_at=pg_catalog.now();
    RETURN;
  END IF;

  SELECT MAX(CASE WHEN pillar='computational_power' THEN score END), MAX(CASE WHEN pillar='communication' THEN score END), MAX(CASE WHEN pillar='knowledge' THEN score END), MAX(CASE WHEN pillar='creativity' THEN score END), MAX(CASE WHEN pillar='drive' THEN score END)
  INTO comp, comm, know, crea, drv FROM public.assessment_scores WHERE assessment_id = latest;

  INSERT INTO public.user_scores (user_id, computational_power, communication, knowledge, creativity, drive, assessments_completed, match_quality_pct, updated_at)
  VALUES (p_user, COALESCE(comp,0), COALESCE(comm,0), COALESCE(know,0), COALESCE(crea,0), COALESCE(drv,0),
    (SELECT COUNT(*) FROM public.assessments WHERE user_id=p_user AND completed_at IS NOT NULL),
    pg_catalog.ROUND((COALESCE(comp,0)+COALESCE(comm,0)+COALESCE(know,0)+COALESCE(crea,0)+COALESCE(drv,0))/50*100, 2), pg_catalog.now())
  ON CONFLICT (user_id) DO UPDATE SET computational_power=EXCLUDED.computational_power, communication=EXCLUDED.communication, knowledge=EXCLUDED.knowledge, creativity=EXCLUDED.creativity, drive=EXCLUDED.drive, assessments_completed=EXCLUDED.assessments_completed, match_quality_pct=EXCLUDED.match_quality_pct, updated_at=pg_catalog.now();

  best := CASE WHEN comp >= GREATEST(comm, know, crea, drv) THEN 'owl' WHEN comm >= GREATEST(comp, know, crea, drv) THEN 'parrot' WHEN know >= GREATEST(comp, comm, crea, drv) THEN 'elephant' WHEN crea >= GREATEST(comp, comm, know, drv) THEN 'fox' WHEN drv >= GREATEST(comp, comm, know, crea) THEN 'horse' ELSE 'wolf' END;
  UPDATE public.profiles SET ximatar = best WHERE id = p_user;
END;
$function$;

-- 30. recompute_matches
CREATE OR REPLACE FUNCTION public.recompute_matches(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  DELETE FROM public.user_opportunity_matches WHERE user_id = p_user;
  INSERT INTO public.user_opportunity_matches(user_id, opportunity_id, match_score, rationale)
  SELECT p_user, o.id, pg_catalog.ROUND((pg_catalog.random()*30 + 70)::numeric, 2), pg_catalog.jsonb_build_object('algo', 'stub', 'version', '1.0')
  FROM public.opportunities o LIMIT 20;
END;
$function$;