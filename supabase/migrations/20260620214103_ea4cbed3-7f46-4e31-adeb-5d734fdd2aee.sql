
-- Candidate funnel (distinct entities)
CREATE OR REPLACE FUNCTION public.admin_get_candidate_funnel(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - (p_days || ' days')::interval;
  _profiles int; _ar int; _inv int; _sub int; _rev int; _off int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(DISTINCT id) INTO _profiles
    FROM public.profiles WHERE created_at >= _since;

  SELECT COUNT(DISTINCT user_id) INTO _ar
    FROM public.assessment_results
    WHERE completed = true AND computed_at >= _since;

  SELECT COUNT(DISTINCT candidate_profile_id) INTO _inv
    FROM public.challenge_invitations WHERE created_at >= _since;

  SELECT COUNT(DISTINCT candidate_profile_id) INTO _sub
    FROM public.challenge_submissions WHERE created_at >= _since;

  SELECT COUNT(DISTINCT candidate_profile_id) INTO _rev
    FROM public.challenge_reviews WHERE created_at >= _since;

  SELECT COUNT(DISTINCT candidate_user_id) INTO _off
    FROM public.hiring_offers WHERE created_at >= _since;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'steps', jsonb_build_array(
      jsonb_build_object('key','profiles','label','Profili candidato','count',_profiles),
      jsonb_build_object('key','assessment_completed','label','Assessment completati','count',_ar),
      jsonb_build_object('key','invitations','label','Inviti challenge (distinti)','count',_inv),
      jsonb_build_object('key','submissions','label','Submission (distinti)','count',_sub),
      jsonb_build_object('key','reviews','label','Review (distinti)','count',_rev),
      jsonb_build_object('key','offers','label','Offerte (distinti)','count',_off)
    )
  );
END $$;

-- Business funnel (grain: goal)
CREATE OR REPLACE FUNCTION public.admin_get_business_funnel(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - (p_days || ' days')::interval;
  _bp int; _bwc int;
  _goals int; _active int; _ch int; _sl int; _off int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(*) INTO _bp FROM public.business_profiles;
  SELECT COUNT(DISTINCT business_id) INTO _bwc FROM public.business_challenges;

  SELECT COUNT(*) INTO _goals FROM public.hiring_goal_drafts WHERE created_at >= _since;
  SELECT COUNT(*) INTO _active FROM public.hiring_goal_drafts WHERE status = 'active';

  SELECT COUNT(DISTINCT hiring_goal_id) INTO _ch
    FROM public.business_challenges
    WHERE created_at >= _since AND hiring_goal_id IS NOT NULL;

  SELECT COUNT(DISTINCT hiring_goal_id) INTO _sl
    FROM public.shortlist_results
    WHERE created_at >= _since AND hiring_goal_id IS NOT NULL;

  SELECT COUNT(DISTINCT hiring_goal_id) INTO _off
    FROM public.hiring_offers
    WHERE created_at >= _since AND hiring_goal_id IS NOT NULL;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'context', jsonb_build_object(
      'business_profiles', _bp,
      'businesses_with_challenges', _bwc
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('key','goals','label','Hiring goal (totali)','count',_goals,'sub_label','di cui attivi','sub_count',_active),
      jsonb_build_object('key','goals_with_challenges','label','Goal con challenge','count',_ch),
      jsonb_build_object('key','goals_with_shortlist','label','Goal con shortlist','count',_sl),
      jsonb_build_object('key','goals_with_offers','label','Goal con offerte','count',_off)
    )
  );
END $$;

-- Feed overview
CREATE OR REPLACE FUNCTION public.admin_get_feed_overview(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - (p_days || ' days')::interval;
  _items int; _r int; _s int; _c int; _by_type jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(*) INTO _items FROM public.feed_items;
  SELECT COUNT(*) INTO _r FROM public.feed_reactions;
  SELECT COUNT(*) INTO _s FROM public.feed_seen_items;
  SELECT COUNT(*) INTO _c FROM public.feed_consumption;

  SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO _by_type FROM (
    SELECT COALESCE(type,'unknown') AS type, COUNT(*)::int AS n
    FROM public.feed_items
    GROUP BY 1 ORDER BY 2 DESC LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'feed_items', _items,
    'reactions', _r,
    'seen', _s,
    'consumption', _c,
    'items_by_type', _by_type
  );
END $$;

-- Metrics catalog
CREATE OR REPLACE FUNCTION public.admin_get_metrics_catalog()
RETURNS TABLE(metric_name text, days int, first_day date, last_day date, total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT m.metric_name,
         COUNT(*)::int AS days,
         MIN(m.metric_date) AS first_day,
         MAX(m.metric_date) AS last_day,
         COALESCE(SUM(m.metric_value),0)::numeric AS total
  FROM public.metrics_daily m
  GROUP BY m.metric_name
  ORDER BY days DESC, m.metric_name;
END $$;

-- Metrics trend
CREATE OR REPLACE FUNCTION public.admin_get_metrics_trend(p_metric_names text[], p_days int DEFAULT 30)
RETURNS TABLE(metric_name text, metric_date date, metric_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT m.metric_name, m.metric_date, m.metric_value
  FROM public.metrics_daily m
  WHERE m.metric_name = ANY(p_metric_names)
    AND m.metric_date >= (now() - (p_days || ' days')::interval)::date
  ORDER BY m.metric_name, m.metric_date;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_get_candidate_funnel(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_business_funnel(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_feed_overview(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics_trend(text[], int) TO authenticated;
