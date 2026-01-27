-- BATCH 5: Final batch - remaining query functions (9 functions)
-- Hardened SECURITY DEFINER: fixed search_path = pg_catalog, public (2026-01-27)

-- 41. get_next_feed_item
CREATE OR REPLACE FUNCTION public.get_next_feed_item()
 RETURNS TABLE(id uuid, type text, source text, subject_ximatar_id uuid, payload jsonb, created_at timestamp with time zone, priority integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  current_profile_id uuid;
  is_business boolean := false;
  is_mentor boolean := false;
  next_item record;
BEGIN
  SELECT p.id INTO current_profile_id FROM public.profiles p WHERE p.user_id = current_user_id;
  IF current_profile_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.business_profiles WHERE user_id = current_user_id) THEN is_business := true; END IF;
  IF EXISTS (SELECT 1 FROM public.mentors WHERE user_id = current_user_id) THEN is_mentor := true; END IF;
  
  IF is_business THEN
    SELECT fi.* INTO next_item FROM public.feed_items fi WHERE fi.audience_type = 'business' AND fi.business_id = current_user_id
      AND NOT EXISTS (SELECT 1 FROM public.feed_seen_items fsi WHERE fsi.profile_id = current_profile_id AND fsi.feed_item_id = fi.id)
      ORDER BY fi.priority DESC, fi.created_at DESC LIMIT 1;
  ELSIF is_mentor THEN
    SELECT fi.* INTO next_item FROM public.feed_items fi WHERE fi.audience_type = 'mentor' AND fi.mentor_profile_id = current_profile_id
      AND NOT EXISTS (SELECT 1 FROM public.feed_seen_items fsi WHERE fsi.profile_id = current_profile_id AND fsi.feed_item_id = fi.id)
      ORDER BY fi.priority DESC, fi.created_at DESC LIMIT 1;
  ELSE
    SELECT fi.* INTO next_item FROM public.feed_items fi WHERE ((fi.audience_type = 'candidate' AND fi.candidate_profile_id = current_profile_id)
      OR EXISTS (SELECT 1 FROM public.assessment_results ar WHERE ar.user_id = current_user_id AND ar.ximatar_id = fi.subject_ximatar_id))
      AND NOT EXISTS (SELECT 1 FROM public.feed_seen_items fsi WHERE fsi.profile_id = current_profile_id AND fsi.feed_item_id = fi.id)
      ORDER BY fi.priority DESC, fi.created_at DESC LIMIT 1;
  END IF;
  
  IF next_item IS NOT NULL THEN
    INSERT INTO public.feed_seen_items (profile_id, feed_item_id, seen_at) VALUES (current_profile_id, next_item.id, pg_catalog.now()) ON CONFLICT DO NOTHING;
    INSERT INTO public.feed_consumption (profile_id, last_seen_at, last_seen_feed_item_id) VALUES (current_profile_id, pg_catalog.now(), next_item.id)
      ON CONFLICT (profile_id) DO UPDATE SET last_seen_at = pg_catalog.now(), last_seen_feed_item_id = next_item.id, updated_at = pg_catalog.now();
    RETURN QUERY SELECT next_item.id, next_item.type::text, next_item.source::text, next_item.subject_ximatar_id, next_item.payload, next_item.created_at, next_item.priority;
  END IF;
  RETURN;
END;
$function$;

-- 42. get_candidate_invitations
CREATE OR REPLACE FUNCTION public.get_candidate_invitations(p_user_id uuid)
 RETURNS TABLE(id uuid, business_id uuid, hiring_goal_id uuid, status text, invite_token uuid, created_at timestamp with time zone, company_name text, role_title text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN QUERY
  SELECT ci.id, ci.business_id, ci.hiring_goal_id, ci.status, ci.invite_token, ci.created_at, COALESCE(bp.company_name, 'Company'), hg.role_title
  FROM public.challenge_invitations ci
  JOIN public.profiles p ON p.id = ci.candidate_profile_id
  LEFT JOIN public.business_profiles bp ON bp.user_id = ci.business_id
  LEFT JOIN public.hiring_goal_drafts hg ON hg.id = ci.hiring_goal_id
  WHERE p.user_id = p_user_id ORDER BY ci.created_at DESC;
END;
$function$;

-- 43. get_candidate_visibility
CREATE OR REPLACE FUNCTION public.get_candidate_visibility()
 RETURNS TABLE(user_id uuid, profile_id uuid, display_name text, ximatar public.ximatar_type, ximatar_id uuid, ximatar_label text, ximatar_image text, evaluation_score numeric, pillar_average numeric, computational_power numeric, communication numeric, knowledge numeric, creativity numeric, drive numeric, computed_at timestamp with time zone, rank bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'business'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.user_id, p.id as profile_id,
    COALESCE(NULLIF(pg_catalog.TRIM(p.name), ''), NULLIF(pg_catalog.TRIM(p.full_name), ''), 'User ' || pg_catalog.LEFT(p.user_id::text, 8)) as display_name,
    p.ximatar, COALESCE(p.ximatar_id, ar.ximatar_id) as ximatar_id,
    COALESCE(x.label, pg_catalog.LOWER(p.ximatar::text), 'unknown') as ximatar_label,
    COALESCE(NULLIF(p.ximatar_image, ''), pg_catalog.REPLACE(x.image_url, 'public/', '/'), CASE WHEN p.ximatar IS NOT NULL THEN '/ximatars/' || pg_catalog.LOWER(p.ximatar::text) || '.png' ELSE NULL END, '/placeholder.svg') as ximatar_image,
    COALESCE(ar.total_score, 0)::numeric AS evaluation_score,
    pg_catalog.ROUND((COALESCE((p.pillar_scores->>'computational_power')::numeric, ps_comp.score, 0) + COALESCE((p.pillar_scores->>'communication')::numeric, ps_comm.score, 0) + COALESCE((p.pillar_scores->>'knowledge')::numeric, ps_know.score, 0) + COALESCE((p.pillar_scores->>'creativity')::numeric, ps_crea.score, 0) + COALESCE((p.pillar_scores->>'drive')::numeric, ps_drv.score, 0)) / 5, 2)::numeric AS pillar_average,
    COALESCE((p.pillar_scores->>'computational_power')::numeric, ps_comp.score, 0)::numeric as computational_power,
    COALESCE((p.pillar_scores->>'communication')::numeric, ps_comm.score, 0)::numeric as communication,
    COALESCE((p.pillar_scores->>'knowledge')::numeric, ps_know.score, 0)::numeric as knowledge,
    COALESCE((p.pillar_scores->>'creativity')::numeric, ps_crea.score, 0)::numeric as creativity,
    COALESCE((p.pillar_scores->>'drive')::numeric, ps_drv.score, 0)::numeric as drive,
    ar.computed_at,
    pg_catalog.ROW_NUMBER() OVER (ORDER BY COALESCE(ar.total_score, 0) DESC, COALESCE(ar.computed_at, p.created_at) DESC, pg_catalog.random() * 0.05)::bigint AS rank
  FROM public.profiles p
  LEFT JOIN LATERAL (SELECT * FROM public.assessment_results WHERE assessment_results.user_id = p.user_id ORDER BY computed_at DESC NULLS LAST LIMIT 1) ar ON true
  LEFT JOIN public.ximatars x ON x.id = COALESCE(p.ximatar_id, ar.ximatar_id)
  LEFT JOIN public.pillar_scores ps_comp ON ps_comp.assessment_result_id = ar.id AND ps_comp.pillar = 'computational_power'
  LEFT JOIN public.pillar_scores ps_comm ON ps_comm.assessment_result_id = ar.id AND ps_comm.pillar = 'communication'
  LEFT JOIN public.pillar_scores ps_know ON ps_know.assessment_result_id = ar.id AND ps_know.pillar = 'knowledge'
  LEFT JOIN public.pillar_scores ps_crea ON ps_crea.assessment_result_id = ar.id AND ps_crea.pillar = 'creativity'
  LEFT JOIN public.pillar_scores ps_drv ON ps_drv.assessment_result_id = ar.id AND ps_drv.pillar = 'drive'
  WHERE p.user_id IS NOT NULL AND (p.profiling_opt_out = false OR p.profiling_opt_out IS NULL)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'business')
  ORDER BY rank;
END;
$function$;

-- 44. assign_ximatar
CREATE OR REPLACE FUNCTION public.assign_ximatar(p_user uuid, p_assessment uuid, p_lang text DEFAULT 'it'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
declare comp numeric; comm numeric; know numeric; crea numeric; drv numeric; best text; xid uuid; result_id uuid;
begin
  insert into public.assessment_results (user_id, assessment_id) values (p_user, p_assessment)
  on conflict (user_id, assessment_id) do update set computed_at = pg_catalog.now() returning id into result_id;
  select max(case when pillar = 'computational_power' then score end), max(case when pillar = 'communication' then score end), max(case when pillar = 'knowledge' then score end), max(case when pillar = 'creativity' then score end), max(case when pillar = 'drive' then score end) into comp, comm, know, crea, drv from public.assessment_scores where assessment_id = p_assessment;
  best := case when comp >= greatest(comm, know, crea, drv) then 'owl' when comm >= greatest(comp, know, crea, drv) then 'parrot' when know >= greatest(comp, comm, crea, drv) then 'elephant' when crea >= greatest(comp, comm, know, drv) then 'fox' when drv >= greatest(comp, comm, know, crea) then 'horse' else 'wolf' end;
  select id into xid from public.ximatars where label = best limit 1;
  update public.assessment_results set ximatar_id = xid, total_score = coalesce(comp,0) + coalesce(comm,0) + coalesce(know,0) + coalesce(crea,0) + coalesce(drv,0), computed_at = pg_catalog.now() where id = result_id;
  update public.profiles set ximatar = best::public.ximatar_type, ximatar_assigned_at = pg_catalog.now() where user_id = p_user;
  return result_id;
end;
$function$;

-- 45. assign_ximatar_by_pillars
CREATE OR REPLACE FUNCTION public.assign_ximatar_by_pillars(p_result_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE user_uuid UUID; comp_score NUMERIC; comm_score NUMERIC; know_score NUMERIC; crea_score NUMERIC; drv_score NUMERIC; chosen_label TEXT := 'fox'; ximatar_uuid UUID; min_distance NUMERIC := 999999; current_distance NUMERIC; ximatar_rec RECORD; vec_comp NUMERIC; vec_comm NUMERIC; vec_know NUMERIC; vec_crea NUMERIC; vec_drv NUMERIC; user_top_pillar TEXT; user_max_score NUMERIC; ximatar_dominant_pillar TEXT;
BEGIN
  SELECT user_id INTO user_uuid FROM public.assessment_results WHERE id = p_result_id;
  SELECT MAX(CASE WHEN pillar = 'computational_power' THEN score END), MAX(CASE WHEN pillar = 'communication' THEN score END), MAX(CASE WHEN pillar = 'knowledge' THEN score END), MAX(CASE WHEN pillar = 'creativity' THEN score END), MAX(CASE WHEN pillar = 'drive' THEN score END) INTO comp_score, comm_score, know_score, crea_score, drv_score FROM public.pillar_scores WHERE assessment_result_id = p_result_id;
  IF comp_score IS NULL THEN chosen_label := 'fox';
  ELSE
    user_max_score := GREATEST(comp_score, comm_score, know_score, crea_score, drv_score);
    user_top_pillar := CASE WHEN comp_score = user_max_score THEN 'comp_power' WHEN comm_score = user_max_score THEN 'communication' WHEN know_score = user_max_score THEN 'knowledge' WHEN crea_score = user_max_score THEN 'creativity' ELSE 'drive' END;
    FOR ximatar_rec IN SELECT id, label, vector FROM public.ximatars LOOP
      vec_comp := COALESCE((ximatar_rec.vector->>'comp_power')::numeric, 50) / 10.0;
      vec_comm := COALESCE((ximatar_rec.vector->>'communication')::numeric, 50) / 10.0;
      vec_know := COALESCE((ximatar_rec.vector->>'knowledge')::numeric, 50) / 10.0;
      vec_crea := COALESCE((ximatar_rec.vector->>'creativity')::numeric, 50) / 10.0;
      vec_drv := COALESCE((ximatar_rec.vector->>'drive')::numeric, 50) / 10.0;
      current_distance := pg_catalog.SQRT(pg_catalog.POWER((comp_score - vec_comp) * 1.0, 2) + pg_catalog.POWER((comm_score - vec_comm) * 1.1, 2) + pg_catalog.POWER((know_score - vec_know) * 1.0, 2) + pg_catalog.POWER((crea_score - vec_crea) * 1.0, 2) + pg_catalog.POWER((drv_score - vec_drv) * 1.2, 2));
      ximatar_dominant_pillar := CASE ximatar_rec.label WHEN 'lion' THEN 'drive' WHEN 'fox' THEN 'creativity' WHEN 'dolphin' THEN 'communication' WHEN 'cat' THEN 'comp_power' WHEN 'bear' THEN 'knowledge' WHEN 'bee' THEN 'drive' WHEN 'wolf' THEN 'drive' WHEN 'owl' THEN 'knowledge' WHEN 'parrot' THEN 'communication' WHEN 'elephant' THEN 'knowledge' WHEN 'horse' THEN 'drive' WHEN 'chameleon' THEN 'creativity' ELSE NULL END;
      IF user_top_pillar = ximatar_dominant_pillar THEN current_distance := current_distance * 0.75; END IF;
      IF current_distance < min_distance THEN min_distance := current_distance; chosen_label := ximatar_rec.label; ximatar_uuid := ximatar_rec.id; END IF;
    END LOOP;
  END IF;
  IF ximatar_uuid IS NULL THEN SELECT id INTO ximatar_uuid FROM public.ximatars WHERE label = chosen_label LIMIT 1; END IF;
  UPDATE public.assessment_results SET ximatar_id = ximatar_uuid, computed_at = pg_catalog.now() WHERE id = p_result_id;
  UPDATE public.profiles SET ximatar = chosen_label::public.ximatar_type, ximatar_assigned_at = pg_catalog.now() WHERE user_id = user_uuid;
END;
$function$;

-- 46-47. compute_pillar_scores_from_assessment (both overloads)
CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE comp NUMERIC := 0; comm NUMERIC := 0; know NUMERIC := 0; crea NUMERIC := 0; drv NUMERIC := 0; total_weights NUMERIC := 0; q RECORD; open1_score NUMERIC; open2_score NUMERIC;
BEGIN
  FOR q IN SELECT question_id, answer_value, pillar, COALESCE(weight, 1.0) as weight FROM public.assessment_answers WHERE result_id = p_result_id LOOP
    total_weights := total_weights + q.weight;
    CASE q.pillar WHEN 'computational_power' THEN comp := comp + (q.answer_value * q.weight); WHEN 'communication' THEN comm := comm + (q.answer_value * q.weight); WHEN 'knowledge' THEN know := know + (q.answer_value * q.weight); WHEN 'creativity' THEN crea := crea + (q.answer_value * q.weight); WHEN 'drive' THEN drv := drv + (q.answer_value * q.weight); END CASE;
  END LOOP;
  IF total_weights = 0 THEN RETURN; END IF;
  comp := pg_catalog.ROUND((comp / (total_weights * 3)) * 10, 2); comm := pg_catalog.ROUND((comm / (total_weights * 3)) * 10, 2); know := pg_catalog.ROUND((know / (total_weights * 3)) * 10, 2); crea := pg_catalog.ROUND((crea / (total_weights * 3)) * 10, 2); drv := pg_catalog.ROUND((drv / (total_weights * 3)) * 10, 2);
  SELECT AVG(score) INTO open1_score FROM public.assessment_open_responses WHERE attempt_id IN (SELECT attempt_id FROM public.assessment_results WHERE id = p_result_id) AND open_key = 'open1';
  SELECT AVG(score) INTO open2_score FROM public.assessment_open_responses WHERE attempt_id IN (SELECT attempt_id FROM public.assessment_results WHERE id = p_result_id) AND open_key = 'open2';
  IF open1_score IS NOT NULL THEN crea := crea + ((open1_score / 100.0) * 0.6); comm := comm + ((open1_score / 100.0) * 0.4); END IF;
  IF open2_score IS NOT NULL THEN drv := drv + ((open2_score / 100.0) * 0.6); know := know + ((open2_score / 100.0) * 0.4); END IF;
  comp := GREATEST(0, LEAST(10, comp)); comm := GREATEST(0, LEAST(10, comm)); know := GREATEST(0, LEAST(10, know)); crea := GREATEST(0, LEAST(10, crea)); drv := GREATEST(0, LEAST(10, drv));
  INSERT INTO public.pillar_scores (assessment_result_id, pillar, score) VALUES (p_result_id, 'computational_power', comp), (p_result_id, 'communication', comm), (p_result_id, 'knowledge', know), (p_result_id, 'creativity', crea), (p_result_id, 'drive', drv) ON CONFLICT (assessment_result_id, pillar) DO UPDATE SET score = EXCLUDED.score, created_at = pg_catalog.now();
  UPDATE public.assessment_results SET total_score = comp + comm + know + crea + drv, rationale = pg_catalog.jsonb_build_object('pillars', pg_catalog.jsonb_build_object('computational_power', comp, 'communication', comm, 'knowledge', know, 'creativity', crea, 'drive', drv), 'method', 'server_computed'), computed_at = pg_catalog.now() WHERE id = p_result_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_pillar_scores_from_assessment(p_result_id uuid, p_mc_answers jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE comp NUMERIC := 0; comm NUMERIC := 0; know NUMERIC := 0; crea NUMERIC := 0; drv NUMERIC := 0; answer_val INT; question_num INT; variance_factor NUMERIC;
BEGIN
  FOR question_num IN 1..21 LOOP
    answer_val := COALESCE((p_mc_answers->>('q' || question_num))::int, 0);
    variance_factor := 0.9 + (pg_catalog.random() * 0.2);
    IF question_num BETWEEN 1 AND 5 THEN comp := comp + (answer_val * variance_factor);
    ELSIF question_num BETWEEN 6 AND 9 THEN comm := comm + (answer_val * variance_factor);
    ELSIF question_num BETWEEN 10 AND 13 THEN know := know + (answer_val * variance_factor);
    ELSIF question_num BETWEEN 14 AND 17 THEN crea := crea + (answer_val * variance_factor);
    ELSE drv := drv + (answer_val * variance_factor); END IF;
  END LOOP;
  comp := pg_catalog.ROUND((comp / 15) * 10, 2); comm := pg_catalog.ROUND((comm / 12) * 10, 2); know := pg_catalog.ROUND((know / 12) * 10, 2); crea := pg_catalog.ROUND((crea / 12) * 10, 2); drv := pg_catalog.ROUND((drv / 12) * 10, 2);
  comp := GREATEST(0, LEAST(10, comp)); comm := GREATEST(0, LEAST(10, comm)); know := GREATEST(0, LEAST(10, know)); crea := GREATEST(0, LEAST(10, crea)); drv := GREATEST(0, LEAST(10, drv));
  INSERT INTO public.pillar_scores (assessment_result_id, pillar, score) VALUES (p_result_id, 'computational_power', comp), (p_result_id, 'communication', comm), (p_result_id, 'knowledge', know), (p_result_id, 'creativity', crea), (p_result_id, 'drive', drv) ON CONFLICT (assessment_result_id, pillar) DO UPDATE SET score = EXCLUDED.score, created_at = pg_catalog.now();
  UPDATE public.assessment_results SET total_score = comp + comm + know + crea + drv, rationale = pg_catalog.jsonb_build_object('pillars', pg_catalog.jsonb_build_object('computational_power', comp, 'communication', comm, 'knowledge', know, 'creativity', crea, 'drive', drv), 'method', 'client_mc_computed'), computed_at = pg_catalog.now() WHERE id = p_result_id;
END;
$function$;

-- 48. create_chat_thread
CREATE OR REPLACE FUNCTION public.create_chat_thread(p_thread_type text, p_candidate_profile_id uuid, p_business_id uuid DEFAULT NULL::uuid, p_mentor_profile_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE current_user_id uuid := auth.uid(); new_thread_id uuid; mutual_interest_exists boolean := false; mentor_match_exists boolean := false;
BEGIN
  IF p_thread_type NOT IN ('business_candidate', 'mentor_candidate') THEN RAISE EXCEPTION 'Invalid thread_type: %', p_thread_type; END IF;
  IF p_thread_type = 'business_candidate' THEN
    IF p_business_id IS NULL THEN RAISE EXCEPTION 'business_id required'; END IF;
    IF current_user_id != p_business_id AND current_user_id != p_candidate_profile_id THEN
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_candidate_profile_id AND user_id = current_user_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.mutual_interests mi WHERE mi.candidate_profile_id = p_candidate_profile_id AND mi.business_id = p_business_id AND mi.accepted = true) INTO mutual_interest_exists;
    IF NOT mutual_interest_exists THEN RAISE EXCEPTION 'Mutual interest required'; END IF;
    SELECT id INTO new_thread_id FROM public.chat_threads WHERE thread_type = 'business_candidate'::public.thread_type_enum AND candidate_profile_id = p_candidate_profile_id AND business_id = p_business_id LIMIT 1;
    IF new_thread_id IS NOT NULL THEN RETURN new_thread_id; END IF;
    INSERT INTO public.chat_threads (thread_type, candidate_profile_id, business_id, created_by, is_group) VALUES ('business_candidate'::public.thread_type_enum, p_candidate_profile_id, p_business_id, current_user_id, false) RETURNING id INTO new_thread_id;
  ELSIF p_thread_type = 'mentor_candidate' THEN
    IF p_mentor_profile_id IS NULL THEN RAISE EXCEPTION 'mentor_profile_id required'; END IF;
    IF current_user_id != p_mentor_profile_id THEN
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_candidate_profile_id AND user_id = current_user_id) AND NOT EXISTS (SELECT 1 FROM public.mentors WHERE user_id = current_user_id AND id = p_mentor_profile_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.mentor_matches mm JOIN public.profiles p ON p.id = p_candidate_profile_id WHERE mm.mentee_user_id = p.id AND mm.mentor_user_id = p_mentor_profile_id) INTO mentor_match_exists;
    IF NOT mentor_match_exists THEN RAISE EXCEPTION 'Mentor match required'; END IF;
    SELECT id INTO new_thread_id FROM public.chat_threads WHERE thread_type = 'mentor_candidate'::public.thread_type_enum AND candidate_profile_id = p_candidate_profile_id AND mentor_profile_id = p_mentor_profile_id LIMIT 1;
    IF new_thread_id IS NOT NULL THEN RETURN new_thread_id; END IF;
    INSERT INTO public.chat_threads (thread_type, candidate_profile_id, mentor_profile_id, created_by, is_group) VALUES ('mentor_candidate'::public.thread_type_enum, p_candidate_profile_id, p_mentor_profile_id, current_user_id, false) RETURNING id INTO new_thread_id;
  END IF;
  RETURN new_thread_id;
END;
$function$;