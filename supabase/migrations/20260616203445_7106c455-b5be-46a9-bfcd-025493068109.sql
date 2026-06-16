CREATE OR REPLACE FUNCTION public.admin_get_overview()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_build_object(
    'candidates_total',        (SELECT count(*) FROM public.profiles),
    'candidates_active',       (SELECT count(*) FROM public.profiles WHERE account_status='active'),
    'candidates_pending',      (SELECT count(*) FROM public.profiles WHERE account_status='pending_verification'),
    'signups_7d',              (SELECT count(*) FROM public.profiles WHERE created_at >= now()-interval '7 days'),
    'signups_30d',             (SELECT count(*) FROM public.profiles WHERE created_at >= now()-interval '30 days'),
    'businesses_total',        (SELECT count(*) FROM public.business_profiles),
    'businesses_with_plan',    (SELECT count(DISTINCT business_id) FROM public.business_entitlements),
    'businesses_without_plan', (SELECT count(*) FROM public.business_profiles bp WHERE NOT EXISTS (SELECT 1 FROM public.business_entitlements be WHERE be.business_id=bp.id)),
    'plans_by_tier',           COALESCE((SELECT json_object_agg(plan_tier,c) FROM (SELECT plan_tier,count(*) c FROM public.business_entitlements GROUP BY plan_tier) t),'{}'::json),
    'candidate_membership_by_tier', COALESCE((SELECT json_object_agg(mt,c) FROM (SELECT membership_tier::text mt,count(*) c FROM public.profiles WHERE membership_tier IS NOT NULL GROUP BY membership_tier) t),'{}'::json),
    'assessments_completed',   (SELECT count(*) FROM public.assessment_results WHERE completed IS TRUE),
    'avg_score',               (SELECT round(avg(total_score),1) FROM public.assessment_results WHERE completed IS TRUE),
    'challenges_active',       (SELECT count(*) FROM public.business_challenges WHERE status='active'),
    'challenges_total',        (SELECT count(*) FROM public.business_challenges),
    'invitations_total',       (SELECT count(*) FROM public.challenge_invitations),
    'submissions_total',       (SELECT count(*) FROM public.challenge_submissions),
    'ai_invocations_total',    (SELECT count(*) FROM public.ai_invocation_log),
    'ai_invocations_7d',       (SELECT count(*) FROM public.ai_invocation_log WHERE invoked_at >= now()-interval '7 days'),
    'ai_by_model',             COALESCE((SELECT json_object_agg(model_name,c) FROM (SELECT COALESCE(model_name,'(unknown)') model_name,count(*) c FROM public.ai_invocation_log GROUP BY model_name) t),'{}'::json),
    'ai_by_status',            COALESCE((SELECT json_object_agg(st,c) FROM (SELECT COALESCE(status,'(none)') st,count(*) c FROM public.ai_invocation_log GROUP BY status) t),'{}'::json),
    'ai_avg_latency_ms',       (SELECT round(avg(latency_ms)) FROM public.ai_invocation_log WHERE latency_ms IS NOT NULL)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_get_interactions(p_days int DEFAULT 30)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE result json; v_days int; v_since timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_days := GREATEST(LEAST(p_days,365),1);
  v_since := now() - (v_days || ' days')::interval;
  SELECT json_build_object(
    'window_days',  v_days,
    'total_events', (SELECT count(*) FROM public.audit_events WHERE occurred_at >= v_since),
    'by_actor',     COALESCE((SELECT json_object_agg(at,c) FROM (SELECT COALESCE(actor_type,'(unknown)') at,count(*) c FROM public.audit_events WHERE occurred_at>=v_since GROUP BY actor_type) t),'{}'::json),
    'by_action',    COALESCE((SELECT json_agg(json_build_object('action',action,'actor_type',actor_type,'n',c) ORDER BY c DESC) FROM (SELECT action,actor_type,count(*) c FROM public.audit_events WHERE occurred_at>=v_since GROUP BY action,actor_type ORDER BY count(*) DESC LIMIT 40) t),'[]'::json),
    'by_day',       COALESCE((SELECT json_agg(json_build_object('day',d,'n',c) ORDER BY d) FROM (SELECT date_trunc('day',occurred_at)::date d,count(*) c FROM public.audit_events WHERE occurred_at>=v_since GROUP BY 1) t),'[]'::json)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_get_candidate_analytics()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_build_object(
    'ximatar_distribution', COALESCE((SELECT json_object_agg(label,c) FROM (
        SELECT COALESCE(x.label,p.ximatar_name,'unknown') label, count(*) c
        FROM public.profiles p LEFT JOIN public.ximatars x ON x.id=p.ximatar_id
        WHERE p.ximatar_id IS NOT NULL OR p.ximatar_name IS NOT NULL GROUP BY 1) t),'{}'::json),
    'pillar_averages', (SELECT json_build_object(
        'drive',               round(avg((pillar_scores->>'drive')::numeric),2),
        'computational_power', round(avg((pillar_scores->>'computational_power')::numeric),2),
        'communication',       round(avg((pillar_scores->>'communication')::numeric),2),
        'creativity',          round(avg((pillar_scores->>'creativity')::numeric),2),
        'knowledge',           round(avg((pillar_scores->>'knowledge')::numeric),2)
      ) FROM public.profiles WHERE pillar_scores IS NOT NULL),
    'ximatar_level_distribution', COALESCE((SELECT json_object_agg(lvl::text,c) FROM (SELECT COALESCE(ximatar_level,0) lvl,count(*) c FROM public.profiles WHERE ximatar_id IS NOT NULL OR ximatar_name IS NOT NULL GROUP BY 1) t),'{}'::json),
    'profiling_opt_out',     (SELECT count(*) FROM public.profiles WHERE profiling_opt_out IS TRUE),
    'assessments_completed', (SELECT count(*) FROM public.assessment_results WHERE completed IS TRUE),
    'pipeline_invitations_by_level', COALESCE((SELECT json_object_agg(lvl::text,c) FROM (SELECT bc.level lvl,count(*) c FROM public.challenge_invitations ci JOIN public.business_challenges bc ON bc.id=ci.challenge_id GROUP BY bc.level) t),'{}'::json),
    'pipeline_submissions_by_level', COALESCE((SELECT json_object_agg(lvl::text,c) FROM (SELECT bc.level lvl,count(*) c FROM public.challenge_submissions cs JOIN public.challenge_invitations ci ON ci.id=cs.invitation_id JOIN public.business_challenges bc ON bc.id=ci.challenge_id GROUP BY bc.level) t),'{}'::json)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_get_xima_evolution(p_limit int DEFAULT 50)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT COALESCE(json_agg(json_build_object(
      'candidate_ref',   candidate_ref,
      'source_type',     source_type,
      'source_function', source_function,
      'deltas', json_build_object(
        'drive',drive_delta,'computational_power',computational_power_delta,
        'communication',communication_delta,'creativity',creativity_delta,'knowledge',knowledge_delta),
      'reasoning', left(reasoning,200),
      'created_at', created_at) ORDER BY created_at DESC),'[]'::json)
  INTO result FROM (
    SELECT left(md5(user_id::text),8) candidate_ref, source_type, source_function,
           drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta,
           reasoning, created_at
    FROM public.pillar_trajectory_log
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(p_limit,1),200)
  ) s;
  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_get_overview()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_interactions(int)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_candidate_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_xima_evolution(int)   TO authenticated;