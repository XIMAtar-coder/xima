-- BATCH 4: Feed and Interest functions (10 functions)
-- Hardened SECURITY DEFINER: fixed search_path = pg_catalog, public (2026-01-27)

-- 31. emit_feed_signal
CREATE OR REPLACE FUNCTION public.emit_feed_signal(p_type text, p_source text, p_subject_ximatar_id uuid, p_payload jsonb, p_visibility jsonb DEFAULT '{"public": true}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  payload_hash text; existing_id uuid; new_id uuid; validated_source text;
BEGIN
  validated_source := pg_catalog.lower(pg_catalog.trim(p_source));
  IF validated_source NOT IN ('candidate', 'business', 'system') THEN
    RAISE EXCEPTION 'Invalid source: %, allowed: candidate|business|system', p_source;
  END IF;
  payload_hash := pg_catalog.encode(pg_catalog.sha256((p_type || p_subject_ximatar_id::text || COALESCE(p_payload->>'level', '') || COALESCE(p_payload->>'challenge_id', '') || COALESCE(p_payload->>'skill', ''))::bytea), 'hex');
  SELECT id INTO existing_id FROM public.feed_items WHERE type = p_type AND subject_ximatar_id = p_subject_ximatar_id AND created_at > (pg_catalog.now() - interval '24 hours') AND payload->>'_hash' = payload_hash LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  INSERT INTO public.feed_items (type, source, subject_ximatar_id, payload, visibility)
  VALUES (p_type, validated_source, p_subject_ximatar_id, p_payload || pg_catalog.jsonb_build_object('_hash', payload_hash), p_visibility)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;

-- 32. emit_interest_aggregated_signal
CREATE OR REPLACE FUNCTION public.emit_interest_aggregated_signal(p_ximatar_id uuid, p_count integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE v_ximatar record; v_payload jsonb;
BEGIN
  SELECT name, image INTO v_ximatar FROM public.ximatars WHERE id = p_ximatar_id;
  v_payload := pg_catalog.jsonb_build_object('normalized_text', p_count || ' companies showed interest', 'count', p_count, 'ximatar_name', COALESCE(v_ximatar.name, 'Anonymous'), 'ximatar_image', COALESCE(v_ximatar.image, '/ximatars/owl.png'));
  RETURN public.emit_feed_signal('interest_aggregated', 'system', p_ximatar_id, v_payload, pg_catalog.jsonb_build_object('public', false));
END;
$function$;

-- 33. emit_challenge_completed_signal
CREATE OR REPLACE FUNCTION public.emit_challenge_completed_signal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE candidate_ximatar_id uuid; challenge_level int; ximatar_name text; ximatar_image text;
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    SELECT COALESCE(bc.level, 2) INTO challenge_level FROM public.business_challenges bc WHERE bc.id = NEW.challenge_id;
    IF challenge_level >= 2 THEN
      SELECT p.ximatar_id, x.label, x.image_url INTO candidate_ximatar_id, ximatar_name, ximatar_image
      FROM public.profiles p LEFT JOIN public.ximatars x ON x.id = p.ximatar_id WHERE p.id = NEW.candidate_profile_id;
      IF candidate_ximatar_id IS NOT NULL THEN
        PERFORM public.emit_feed_signal('challenge_completed', 'candidate', candidate_ximatar_id,
          pg_catalog.jsonb_build_object('level', challenge_level, 'challenge_id', NEW.challenge_id, 'normalized_text', 'Completed a Level ' || challenge_level || ' challenge', 'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'), 'ximatar_image', ximatar_image),
          pg_catalog.jsonb_build_object('public', true));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 34. emit_skill_validated_signal
CREATE OR REPLACE FUNCTION public.emit_skill_validated_signal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE candidate_ximatar_id uuid; ximatar_name text; ximatar_image text; top_pillar text; top_score numeric; skill_name text;
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    SELECT p.ximatar_id, x.label, x.image_url INTO candidate_ximatar_id, ximatar_name, ximatar_image
    FROM public.profiles p LEFT JOIN public.ximatars x ON x.id = p.ximatar_id WHERE p.user_id = NEW.user_id;
    IF candidate_ximatar_id IS NOT NULL THEN
      SELECT pillar, score INTO top_pillar, top_score FROM public.pillar_scores WHERE assessment_result_id = NEW.id ORDER BY score DESC LIMIT 1;
      skill_name := CASE top_pillar WHEN 'computational_power' THEN 'Analytical Thinking' WHEN 'communication' THEN 'Communication' WHEN 'knowledge' THEN 'Domain Expertise' WHEN 'creativity' THEN 'Creative Problem Solving' WHEN 'drive' THEN 'Execution & Drive' ELSE 'Professional Skill' END;
      PERFORM public.emit_feed_signal('skill_validated', 'system', candidate_ximatar_id,
        pg_catalog.jsonb_build_object('skill', skill_name, 'score', top_score, 'normalized_text', 'Validated skill: ' || skill_name, 'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'), 'ximatar_image', ximatar_image, 'skill_tags', pg_catalog.jsonb_build_array(skill_name)),
        pg_catalog.jsonb_build_object('public', true));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 35. emit_level_reached_signal
CREATE OR REPLACE FUNCTION public.emit_level_reached_signal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE candidate_ximatar_id uuid; ximatar_name text; ximatar_image text; new_level int;
BEGIN
  IF NEW.decision IN ('proceed_level2', 'proceed_level3', 'shortlist') THEN
    new_level := CASE NEW.decision WHEN 'proceed_level2' THEN 2 WHEN 'proceed_level3' THEN 3 WHEN 'shortlist' THEN 4 ELSE 2 END;
    SELECT p.ximatar_id, x.label, x.image_url INTO candidate_ximatar_id, ximatar_name, ximatar_image
    FROM public.challenge_invitations ci JOIN public.profiles p ON p.id = ci.candidate_profile_id LEFT JOIN public.ximatars x ON x.id = p.ximatar_id WHERE ci.id = NEW.invitation_id;
    IF candidate_ximatar_id IS NOT NULL THEN
      PERFORM public.emit_feed_signal('level_reached', 'system', candidate_ximatar_id,
        pg_catalog.jsonb_build_object('level', new_level, 'normalized_text', CASE new_level WHEN 2 THEN 'Advanced to Level 2' WHEN 3 THEN 'Advanced to Level 3' WHEN 4 THEN 'Reached final stage' ELSE 'Progressed' END, 'ximatar_name', COALESCE(ximatar_name, 'XIMAtar'), 'ximatar_image', ximatar_image),
        pg_catalog.jsonb_build_object('public', true));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 36. check_and_emit_interest_aggregated
CREATE OR REPLACE FUNCTION public.check_and_emit_interest_aggregated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE candidate_ximatar_id uuid; interest_count int;
BEGIN
  SELECT p.ximatar_id INTO candidate_ximatar_id FROM public.profiles p WHERE p.id = NEW.candidate_profile_id;
  IF candidate_ximatar_id IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(DISTINCT business_id) INTO interest_count FROM public.business_shortlists WHERE candidate_profile_id = NEW.candidate_profile_id;
  IF interest_count >= 3 THEN PERFORM public.emit_interest_aggregated_signal(candidate_ximatar_id, interest_count); END IF;
  RETURN NEW;
END;
$function$;

-- 37. record_business_interest
CREATE OR REPLACE FUNCTION public.record_business_interest(p_feed_item_id uuid, p_hiring_goal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE v_business_id uuid; v_candidate_ximatar_id uuid; v_interest_id uuid;
BEGIN
  SELECT id INTO v_business_id FROM public.business_profiles WHERE user_id = auth.uid();
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'User is not a business'; END IF;
  SELECT subject_ximatar_id INTO v_candidate_ximatar_id FROM public.feed_items WHERE id = p_feed_item_id;
  IF v_candidate_ximatar_id IS NULL THEN RAISE EXCEPTION 'Feed item not found'; END IF;
  INSERT INTO public.mutual_interest (business_id, candidate_ximatar_id, hiring_goal_id, feed_item_id, business_interested_at)
  VALUES (v_business_id, v_candidate_ximatar_id, p_hiring_goal_id, p_feed_item_id, pg_catalog.now())
  ON CONFLICT (business_id, candidate_ximatar_id, hiring_goal_id) DO UPDATE SET business_interested_at = COALESCE(public.mutual_interest.business_interested_at, pg_catalog.now()), updated_at = pg_catalog.now()
  RETURNING id INTO v_interest_id;
  RETURN v_interest_id;
END;
$function$;

-- 38. accept_interest
CREATE OR REPLACE FUNCTION public.accept_interest(p_interest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE v_interest record; v_candidate_user_id uuid; v_business_user_id uuid; v_thread_id uuid;
BEGIN
  SELECT * INTO v_interest FROM public.mutual_interest WHERE id = p_interest_id;
  IF v_interest IS NULL THEN RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Interest record not found'); END IF;
  SELECT ar.user_id INTO v_candidate_user_id FROM public.assessment_results ar WHERE ar.ximatar_id = v_interest.candidate_ximatar_id LIMIT 1;
  IF v_candidate_user_id IS NULL OR v_candidate_user_id != auth.uid() THEN RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF v_interest.business_interested_at IS NULL THEN RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Business has not shown interest yet'); END IF;
  UPDATE public.mutual_interest SET candidate_accepted_at = pg_catalog.now(), updated_at = pg_catalog.now() WHERE id = p_interest_id;
  IF v_interest.chat_thread_id IS NULL THEN
    SELECT user_id INTO v_business_user_id FROM public.business_profiles WHERE id = v_interest.business_id;
    INSERT INTO public.chat_threads (created_by, topic) VALUES (v_candidate_user_id, 'Mutual Interest Chat') RETURNING id INTO v_thread_id;
    INSERT INTO public.chat_participants (thread_id, user_id, role) VALUES (v_thread_id, v_candidate_user_id, 'candidate'), (v_thread_id, v_business_user_id, 'business');
    UPDATE public.mutual_interest SET chat_thread_id = v_thread_id WHERE id = p_interest_id;
    RETURN pg_catalog.jsonb_build_object('success', true, 'chat_created', true, 'thread_id', v_thread_id);
  END IF;
  RETURN pg_catalog.jsonb_build_object('success', true, 'chat_created', false, 'thread_id', v_interest.chat_thread_id);
END;
$function$;

-- 39. get_interest_count_for_ximatar
CREATE OR REPLACE FUNCTION public.get_interest_count_for_ximatar(p_ximatar_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE count_val integer;
BEGIN
  SELECT COUNT(DISTINCT business_id) INTO count_val FROM public.mutual_interest WHERE candidate_ximatar_id = p_ximatar_id AND business_interested_at IS NOT NULL;
  RETURN COALESCE(count_val, 0);
END;
$function$;

-- 40. ensure_mentor_thread
CREATE OR REPLACE FUNCTION public.ensure_mentor_thread(p_user uuid, p_mentor uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE t uuid;
BEGIN
  SELECT ct.id INTO t FROM public.chat_threads ct
  JOIN public.chat_participants p1 ON p1.thread_id = ct.id AND p1.user_id = p_user
  JOIN public.chat_participants p2 ON p2.thread_id = ct.id AND p2.user_id = p_mentor
  WHERE ct.is_group = false LIMIT 1;
  IF t IS NULL THEN
    INSERT INTO public.chat_threads(created_by, is_group, topic) VALUES (p_user, false, 'mentor') RETURNING id INTO t;
    INSERT INTO public.chat_participants(thread_id, user_id) VALUES (t, p_user);
    INSERT INTO public.chat_participants(thread_id, user_id) VALUES (t, p_mentor);
  END IF;
  RETURN t;
END;
$function$;