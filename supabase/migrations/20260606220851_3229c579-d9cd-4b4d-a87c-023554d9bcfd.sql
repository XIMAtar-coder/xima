
CREATE OR REPLACE FUNCTION public.emit_feed_signal(p_type text, p_source text, p_subject_ximatar_id uuid, p_payload jsonb, p_visibility jsonb DEFAULT '{"public": true}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  payload_hash text; existing_id uuid; new_id uuid; validated_source text;
BEGIN
  validated_source := pg_catalog.lower(pg_catalog.btrim(p_source));
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

CREATE OR REPLACE FUNCTION public.get_candidate_visibility()
 RETURNS TABLE(user_id uuid, profile_id uuid, display_name text, ximatar ximatar_type, ximatar_id uuid, ximatar_label text, ximatar_image text, evaluation_score numeric, pillar_average numeric, computational_power numeric, communication numeric, knowledge numeric, creativity numeric, drive numeric, computed_at timestamp with time zone, rank bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'business'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.user_id, p.id as profile_id,
    COALESCE(NULLIF(pg_catalog.btrim(p.name), ''), NULLIF(pg_catalog.btrim(p.full_name), ''), 'User ' || pg_catalog.LEFT(p.user_id::text, 8)) as display_name,
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
