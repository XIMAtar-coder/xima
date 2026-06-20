
-- KPI ultimi N giorni
CREATE OR REPLACE FUNCTION public.admin_get_ai_quality_kpis(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'invocations', COUNT(*),
    'success_rate', CASE WHEN COUNT(*)>0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status='success')::numeric / COUNT(*)::numeric, 2)
      ELSE 0 END,
    'avg_latency_ms', COALESCE(ROUND(AVG(latency_ms)::numeric,0),0),
    'total_cost_usd', COALESCE(SUM(cost_usd),0),
    'total_tokens', COALESCE(SUM(total_tokens),0),
    'errors', COUNT(*) FILTER (WHERE status <> 'success')
  ) INTO _r
  FROM public.ai_invocation_log
  WHERE invoked_at >= now() - (p_days || ' days')::interval;
  RETURN _r;
END $$;

-- Trend giornaliero
CREATE OR REPLACE FUNCTION public.admin_get_ai_daily_trend(p_days int DEFAULT 30)
RETURNS TABLE(day date, invocations bigint, cost_usd numeric, errors bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT date_trunc('day', invoked_at)::date AS day,
         COUNT(*)::bigint,
         COALESCE(SUM(cost_usd),0)::numeric,
         COUNT(*) FILTER (WHERE status <> 'success')::bigint
  FROM public.ai_invocation_log
  WHERE invoked_at >= now() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1;
END $$;

-- Per function
CREATE OR REPLACE FUNCTION public.admin_get_ai_by_function(p_days int DEFAULT 30)
RETURNS TABLE(function_name text, invocations bigint, cost_usd numeric, avg_latency_ms numeric, success_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT COALESCE(l.function_name,'unknown'),
         COUNT(*)::bigint,
         COALESCE(SUM(l.cost_usd),0)::numeric,
         COALESCE(ROUND(AVG(l.latency_ms)::numeric,0),0),
         CASE WHEN COUNT(*)>0
           THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.status='success')::numeric / COUNT(*)::numeric, 2)
           ELSE 0 END
  FROM public.ai_invocation_log l
  WHERE l.invoked_at >= now() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY 2 DESC;
END $$;

-- Per model
CREATE OR REPLACE FUNCTION public.admin_get_ai_by_model(p_days int DEFAULT 30)
RETURNS TABLE(model_name text, invocations bigint, cost_usd numeric, avg_latency_ms numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT COALESCE(l.model_name,'unknown'),
         COUNT(*)::bigint,
         COALESCE(SUM(l.cost_usd),0)::numeric,
         COALESCE(ROUND(AVG(l.latency_ms)::numeric,0),0)
  FROM public.ai_invocation_log l
  WHERE l.invoked_at >= now() - (p_days || ' days')::interval
  GROUP BY 1
  ORDER BY 2 DESC;
END $$;

-- Errori recenti
CREATE OR REPLACE FUNCTION public.admin_get_ai_recent_errors(p_limit int DEFAULT 50)
RETURNS TABLE(function_name text, model_name text, error_code text, latency_ms int, invoked_at timestamptz, correlation_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT l.function_name, l.model_name, l.error_code, l.latency_ms, l.invoked_at, l.correlation_id
  FROM public.ai_invocation_log l
  WHERE l.status <> 'success'
  ORDER BY l.invoked_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END $$;

-- Budget overview
CREATE OR REPLACE FUNCTION public.admin_get_ai_budget_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _by_tier jsonb; _top jsonb; _month text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  _month := to_char(now(),'YYYY-MM');

  SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO _by_tier FROM (
    SELECT COALESCE(tier,'unknown') AS tier,
           COUNT(*)::int AS users,
           COALESCE(SUM(calls_used),0)::int AS calls_used,
           COALESCE(SUM(calls_limit),0)::int AS calls_limit,
           CASE WHEN COALESCE(SUM(calls_limit),0)>0
             THEN ROUND(100.0 * SUM(calls_used)::numeric / SUM(calls_limit)::numeric, 2)
             ELSE 0 END AS utilization_pct
    FROM public.ai_usage_budget
    WHERE month_key = _month
    GROUP BY 1
    ORDER BY calls_used DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(u)),'[]'::jsonb) INTO _top FROM (
    SELECT LEFT(user_id::text, 8) AS user_short,
           COALESCE(tier,'unknown') AS tier,
           calls_used, calls_limit,
           last_function_called, last_call_at
    FROM public.ai_usage_budget
    WHERE month_key = _month
    ORDER BY calls_used DESC NULLS LAST
    LIMIT 10
  ) u;

  RETURN jsonb_build_object('month', _month, 'by_tier', _by_tier, 'top_consumers', _top);
END $$;

-- Cache stats
CREATE OR REPLACE FUNCTION public.admin_get_ai_cache_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _by_fn jsonb; _total bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COUNT(*) INTO _total FROM public.ai_result_cache;
  SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO _by_fn FROM (
    SELECT COALESCE(function_name,'unknown') AS function_name, COUNT(*)::int AS entries
    FROM public.ai_result_cache
    GROUP BY 1 ORDER BY 2 DESC LIMIT 20
  ) t;
  RETURN jsonb_build_object('entries', _total, 'by_function', _by_fn, 'hit_ratio_available', false);
END $$;

-- Quality indicators
CREATE OR REPLACE FUNCTION public.admin_get_quality_indicators(p_days int DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ar jsonb; _hist jsonb; _top3 jsonb; _rev jsonb; _ev_count bigint; _pt_count bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE completed = true),
    'completed_pct', CASE WHEN COUNT(*)>0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE completed=true)::numeric / COUNT(*)::numeric, 2)
      ELSE 0 END,
    'avg_total_score', COALESCE(ROUND(AVG(total_score)::numeric,2),0),
    'avg_sentiment', COALESCE(ROUND(AVG(sentiment)::numeric,3),0)
  ) INTO _ar
  FROM public.assessment_results
  WHERE computed_at >= now() - (p_days || ' days')::interval;

  SELECT COALESCE(jsonb_agg(row_to_json(h) ORDER BY (h.bucket)),'[]'::jsonb) INTO _hist FROM (
    SELECT (FLOOR(total_score/10)*10)::int AS bucket, COUNT(*)::int AS n
    FROM public.assessment_results
    WHERE computed_at >= now() - (p_days || ' days')::interval
      AND total_score IS NOT NULL
    GROUP BY 1
  ) h;

  SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO _top3 FROM (
    SELECT elem AS archetype, COUNT(*)::int AS n
    FROM public.assessment_results,
         LATERAL jsonb_array_elements_text(COALESCE(top3,'[]'::jsonb)) AS elem
    WHERE computed_at >= now() - (p_days || ' days')::interval
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ) t;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'by_decision', COALESCE(jsonb_object_agg(decision, n) FILTER (WHERE decision IS NOT NULL), '{}'::jsonb)
  ) INTO _rev
  FROM (
    SELECT decision, COUNT(*)::int AS n
    FROM public.challenge_reviews
    WHERE created_at >= now() - (p_days || ' days')::interval
    GROUP BY decision
  ) s;

  SELECT COUNT(*) INTO _ev_count FROM public.assessment_evidence_ledger;
  SELECT COUNT(*) INTO _pt_count FROM public.psychometrics_telemetry;

  RETURN jsonb_build_object(
    'assessment_results', _ar,
    'score_histogram', _hist,
    'top3_archetypes', _top3,
    'challenge_reviews', _rev,
    'evidence_ledger_count', _ev_count,
    'psychometrics_telemetry_count', _pt_count
  );
END $$;

GRANT EXECUTE ON FUNCTION public.admin_get_ai_quality_kpis(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_daily_trend(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_by_function(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_by_model(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_recent_errors(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_budget_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_cache_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_quality_indicators(int) TO authenticated;
