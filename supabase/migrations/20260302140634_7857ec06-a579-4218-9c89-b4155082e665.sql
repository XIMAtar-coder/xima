
-- Step 7: Complete psychometrics telemetry (single atomic migration)

CREATE TABLE IF NOT EXISTS public.psychometrics_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL,
  field_key TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  score_computational_power NUMERIC,
  score_communication NUMERIC,
  score_knowledge NUMERIC,
  score_creativity NUMERIC,
  score_drive NUMERIC,
  total_score NUMERIC,
  ximatar_label TEXT,
  mc_items_total INTEGER,
  mc_items_answered INTEGER,
  open_items_total INTEGER,
  open_items_scored INTEGER,
  open_avg_score NUMERIC,
  open_quality_counts JSONB DEFAULT '{}'::jsonb,
  open_red_flags_count INTEGER DEFAULT 0,
  funnel_step TEXT NOT NULL DEFAULT 'unknown',
  retention_days INTEGER NOT NULL DEFAULT 730,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_field_locale ON public.psychometrics_telemetry (field_key, locale);
CREATE INDEX IF NOT EXISTS idx_telemetry_completed ON public.psychometrics_telemetry (completed_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_expires ON public.psychometrics_telemetry (expires_at);

-- Retention trigger
CREATE OR REPLACE FUNCTION public.set_telemetry_expires_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.expires_at := NEW.created_at + (NEW.retention_days || ' days')::interval;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_telemetry_set_expires ON public.psychometrics_telemetry;
CREATE TRIGGER trg_telemetry_set_expires
  BEFORE INSERT OR UPDATE ON public.psychometrics_telemetry
  FOR EACH ROW EXECUTE FUNCTION public.set_telemetry_expires_at();

-- RLS
ALTER TABLE public.psychometrics_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_telemetry" ON public.psychometrics_telemetry;
CREATE POLICY "admin_read_telemetry"
  ON public.psychometrics_telemetry FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.psychometrics_telemetry IS 'Privacy-safe psychometrics telemetry. NO PII. run_id is one-way SHA-256 hash. Retention: 730 days. Writes: service_role via triggers. Reads: admin only.';

-- Telemetry emit trigger
CREATE OR REPLACE FUNCTION public.trg_emit_psychometrics_telemetry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_run_id TEXT; v_field_key TEXT; v_locale TEXT; v_duration_ms INTEGER;
  v_ximatar_label TEXT; v_pillars JSONB;
  v_open_count INTEGER; v_open_avg NUMERIC; v_open_quality JSONB; v_open_flags INTEGER;
  v_attempt_id TEXT;
BEGIN
  IF NEW.completed_at IS NULL OR (OLD IS NOT NULL AND OLD.completed_at IS NOT DISTINCT FROM NEW.completed_at) THEN RETURN NEW; END IF;
  v_run_id := pg_catalog.encode(pg_catalog.sha256((NEW.user_id::text || NEW.id::text || 'xima_telemetry_salt_v1')::bytea), 'hex');
  SELECT ar.field_key, ar.language INTO v_field_key, v_locale FROM public.assessment_results ar WHERE ar.user_id = NEW.user_id ORDER BY ar.computed_at DESC LIMIT 1;
  v_duration_ms := (NEW.meta->>'duration_ms')::integer;
  SELECT x.label INTO v_ximatar_label FROM public.ximatars x JOIN public.assessment_results ar ON ar.ximatar_id = x.id WHERE ar.user_id = NEW.user_id ORDER BY ar.computed_at DESC LIMIT 1;
  v_pillars := NEW.pillar_scores;
  v_attempt_id := COALESCE((SELECT ar.attempt_id FROM public.assessment_results ar WHERE ar.user_id = NEW.user_id ORDER BY ar.computed_at DESC LIMIT 1), NEW.id);
  SELECT COUNT(*), ROUND(AVG(score)::numeric, 2),
    pg_catalog.jsonb_build_object('excellent', COUNT(*) FILTER (WHERE score >= 8), 'good', COUNT(*) FILTER (WHERE score >= 5 AND score < 8), 'weak', COUNT(*) FILTER (WHERE score < 5)),
    COALESCE(SUM(CASE WHEN el.detected_red_flags IS NOT NULL THEN pg_catalog.array_length(el.detected_red_flags, 1) ELSE 0 END), 0)::integer
  INTO v_open_count, v_open_avg, v_open_quality, v_open_flags
  FROM public.assessment_open_responses aor LEFT JOIN public.assessment_evidence_ledger el ON el.open_response_id = aor.id
  WHERE aor.user_id = NEW.user_id AND aor.attempt_id = v_attempt_id;
  INSERT INTO public.psychometrics_telemetry (run_id, field_key, locale, completed_at, duration_ms,
    score_computational_power, score_communication, score_knowledge, score_creativity, score_drive, total_score,
    ximatar_label, mc_items_total, mc_items_answered, open_items_total, open_items_scored, open_avg_score,
    open_quality_counts, open_red_flags_count, funnel_step)
  VALUES (v_run_id, COALESCE(v_field_key, 'unknown'), COALESCE(v_locale, 'en'), NEW.completed_at, v_duration_ms,
    (v_pillars->>'computational_power')::numeric, (v_pillars->>'communication')::numeric,
    (v_pillars->>'knowledge')::numeric, (v_pillars->>'creativity')::numeric, (v_pillars->>'drive')::numeric,
    NEW.overall_score, v_ximatar_label, (NEW.meta->>'mc_items_total')::integer, (NEW.meta->>'mc_items_answered')::integer,
    COALESCE(v_open_count, 0), COALESCE(v_open_count, 0), v_open_avg,
    COALESCE(v_open_quality, '{}'::jsonb), COALESCE(v_open_flags, 0), 'result');
  PERFORM public.increment_daily_metric('telemetry.assessment_completed');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_emit_telemetry ON public.assessments;
CREATE TRIGGER trg_emit_telemetry AFTER INSERT OR UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.trg_emit_psychometrics_telemetry();

-- Funnel start trigger
CREATE OR REPLACE FUNCTION public.trg_telemetry_funnel_start()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_run_id TEXT;
BEGIN
  IF NEW.started_at IS NOT NULL AND (OLD IS NULL OR OLD.started_at IS NULL) THEN
    v_run_id := pg_catalog.encode(pg_catalog.sha256((NEW.user_id::text || NEW.id::text || 'xima_telemetry_salt_v1')::bytea), 'hex');
    INSERT INTO public.psychometrics_telemetry (run_id, funnel_step, field_key, locale) VALUES (v_run_id, 'start', 'unknown', 'en');
    PERFORM public.increment_daily_metric('telemetry.assessment_started');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_telemetry_funnel_start ON public.assessments;
CREATE TRIGGER trg_telemetry_funnel_start AFTER INSERT OR UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.trg_telemetry_funnel_start();

-- Q1: Completion rate
CREATE OR REPLACE FUNCTION public.telemetry_completion_rate_by_field(p_since DATE DEFAULT CURRENT_DATE - 30)
RETURNS TABLE(field_key TEXT, locale TEXT, starts BIGINT, completions BIGINT, completion_rate NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT pt.field_key, pt.locale,
    COUNT(*) FILTER (WHERE pt.funnel_step = 'start'),
    COUNT(*) FILTER (WHERE pt.funnel_step = 'result'),
    CASE WHEN COUNT(*) FILTER (WHERE pt.funnel_step = 'start') > 0
      THEN ROUND(COUNT(*) FILTER (WHERE pt.funnel_step = 'result')::numeric / COUNT(*) FILTER (WHERE pt.funnel_step = 'start') * 100, 1)
      ELSE 0 END
  FROM public.psychometrics_telemetry pt WHERE pt.completed_at >= p_since
  GROUP BY pt.field_key, pt.locale ORDER BY 4 DESC;
$function$;

-- Q2: Drop-off funnel
CREATE OR REPLACE FUNCTION public.telemetry_dropoff_funnel(p_since DATE DEFAULT CURRENT_DATE - 30)
RETURNS TABLE(funnel_step TEXT, count BIGINT, pct_of_starts NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH totals AS (SELECT funnel_step, COUNT(*) AS cnt FROM public.psychometrics_telemetry WHERE completed_at >= p_since GROUP BY funnel_step),
  start_count AS (SELECT COALESCE(MAX(cnt) FILTER (WHERE funnel_step = 'start'), 1) AS total FROM totals)
  SELECT t.funnel_step, t.cnt, ROUND(t.cnt::numeric / s.total * 100, 1)
  FROM totals t, start_count s
  ORDER BY CASE t.funnel_step WHEN 'start' THEN 1 WHEN 'mc_complete' THEN 2 WHEN 'open_complete' THEN 3 WHEN 'result' THEN 4 ELSE 5 END;
$function$;

-- Q3: Pillar distributions (plpgsql to avoid ROUND(double precision) issue)
CREATE OR REPLACE FUNCTION public.telemetry_pillar_distributions(p_since DATE DEFAULT CURRENT_DATE - 30)
RETURNS TABLE(field_key TEXT, pillar TEXT, mean_score NUMERIC, std_score NUMERIC, p25 NUMERIC, p50 NUMERIC, p75 NUMERIC, p95 NUMERIC, sample_size BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH unpivoted AS (
    SELECT pt.field_key, 'computational_power'::text AS pil, pt.score_computational_power AS score FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.completed_at >= p_since AND pt.score_computational_power IS NOT NULL
    UNION ALL SELECT pt.field_key, 'communication', pt.score_communication FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.completed_at >= p_since AND pt.score_communication IS NOT NULL
    UNION ALL SELECT pt.field_key, 'knowledge', pt.score_knowledge FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.completed_at >= p_since AND pt.score_knowledge IS NOT NULL
    UNION ALL SELECT pt.field_key, 'creativity', pt.score_creativity FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.completed_at >= p_since AND pt.score_creativity IS NOT NULL
    UNION ALL SELECT pt.field_key, 'drive', pt.score_drive FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.completed_at >= p_since AND pt.score_drive IS NOT NULL
  )
  SELECT u.field_key, u.pil,
    ROUND(AVG(u.score)::numeric, 2),
    ROUND(COALESCE(STDDEV(u.score), 0)::numeric, 2),
    ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY u.score))::numeric, 2),
    ROUND((PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY u.score))::numeric, 2),
    ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY u.score))::numeric, 2),
    ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY u.score))::numeric, 2),
    COUNT(*)
  FROM unpivoted u GROUP BY u.field_key, u.pil ORDER BY u.field_key, u.pil;
END;
$function$;

-- Q4: Cross-pillar correlations
CREATE OR REPLACE FUNCTION public.telemetry_pillar_correlations(p_field_key TEXT DEFAULT NULL)
RETURNS TABLE(field_key TEXT, pillar_a TEXT, pillar_b TEXT, correlation NUMERIC, sample_size BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH scores AS (
    SELECT pt.field_key, pt.score_computational_power AS comp, pt.score_communication AS comm,
      pt.score_knowledge AS know, pt.score_creativity AS crea, pt.score_drive AS drv
    FROM public.psychometrics_telemetry pt
    WHERE pt.funnel_step = 'result' AND pt.score_computational_power IS NOT NULL
      AND (p_field_key IS NULL OR pt.field_key = p_field_key)
  )
  SELECT s.field_key, pa.pillar, pb.pillar,
    ROUND(CORR(pa.val, pb.val)::numeric, 3), COUNT(*)
  FROM scores s,
  LATERAL (VALUES ('comp'::text, s.comp), ('comm', s.comm), ('know', s.know), ('crea', s.crea), ('drv', s.drv)) AS pa(pillar, val),
  LATERAL (VALUES ('comp'::text, s.comp), ('comm', s.comm), ('know', s.know), ('crea', s.crea), ('drv', s.drv)) AS pb(pillar, val)
  WHERE pa.pillar < pb.pillar
  GROUP BY s.field_key, pa.pillar, pb.pillar HAVING COUNT(*) >= 10
  ORDER BY s.field_key, pa.pillar, pb.pillar;
END;
$function$;

-- Q5: XIMAtar distribution
CREATE OR REPLACE FUNCTION public.telemetry_ximatar_distribution(p_since DATE DEFAULT CURRENT_DATE - 30)
RETURNS TABLE(field_key TEXT, locale TEXT, ximatar_label TEXT, count BIGINT, pct NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH counts AS (
    SELECT pt.field_key, pt.locale, pt.ximatar_label, COUNT(*) AS cnt
    FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.ximatar_label IS NOT NULL AND pt.completed_at >= p_since
    GROUP BY pt.field_key, pt.locale, pt.ximatar_label
  ), totals AS (SELECT c.field_key, c.locale, SUM(c.cnt) AS total FROM counts c GROUP BY c.field_key, c.locale)
  SELECT c.field_key, c.locale, c.ximatar_label, c.cnt, ROUND(c.cnt::numeric / t.total * 100, 1)
  FROM counts c JOIN totals t USING (field_key, locale) ORDER BY c.field_key, c.locale, c.cnt DESC;
END;
$function$;

-- Q6: Open-answer quality + latency
CREATE OR REPLACE FUNCTION public.telemetry_open_answer_quality(p_since DATE DEFAULT CURRENT_DATE - 7)
RETURNS TABLE(report_date DATE, total_invocations BIGINT, error_count BIGINT, error_rate NUMERIC, p50_latency NUMERIC, p95_latency NUMERIC, p99_latency NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DATE(il.invoked_at), COUNT(*),
    COUNT(*) FILTER (WHERE il.status != 'success'),
    ROUND(COUNT(*) FILTER (WHERE il.status != 'success')::numeric / NULLIF(COUNT(*), 0) * 100, 2),
    ROUND((PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY il.latency_ms))::numeric, 0),
    ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY il.latency_ms))::numeric, 0),
    ROUND((PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY il.latency_ms))::numeric, 0)
  FROM public.ai_invocation_log il WHERE il.function_name = 'analyze-open-answer' AND il.invoked_at >= p_since
  GROUP BY DATE(il.invoked_at) ORDER BY DATE(il.invoked_at) DESC;
END;
$function$;

-- Q7: Weekly summary
CREATE OR REPLACE FUNCTION public.telemetry_weekly_summary()
RETURNS TABLE(metric TEXT, this_week NUMERIC, last_week NUMERIC, change_pct NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH metrics AS (
    SELECT metric_name,
      COALESCE(SUM(metric_value) FILTER (WHERE metric_date >= CURRENT_DATE - 7), 0) AS tw,
      COALESCE(SUM(metric_value) FILTER (WHERE metric_date >= CURRENT_DATE - 14 AND metric_date < CURRENT_DATE - 7), 0) AS lw
    FROM public.metrics_daily
    WHERE metric_name IN ('auth.signup','assessment.completed','email.sent','email.dead_letter','telemetry.assessment_started','telemetry.assessment_completed','l3.video_uploaded','sales.contact_submitted')
    GROUP BY metric_name
  )
  SELECT metric_name, tw, lw, CASE WHEN lw > 0 THEN ROUND((tw - lw) / lw * 100, 1) ELSE 0 END FROM metrics ORDER BY metric_name;
$function$;

-- Q8: Open quality distribution
CREATE OR REPLACE FUNCTION public.telemetry_open_quality_distribution(p_since DATE DEFAULT CURRENT_DATE - 30)
RETURNS TABLE(field_key TEXT, locale TEXT, avg_open_score NUMERIC, total_red_flags BIGINT, excellent_count BIGINT, good_count BIGINT, weak_count BIGINT, sample_size BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT pt.field_key, pt.locale, ROUND(AVG(pt.open_avg_score)::numeric, 2),
    SUM(pt.open_red_flags_count)::bigint,
    SUM((pt.open_quality_counts->>'excellent')::bigint),
    SUM((pt.open_quality_counts->>'good')::bigint),
    SUM((pt.open_quality_counts->>'weak')::bigint),
    COUNT(*)
  FROM public.psychometrics_telemetry pt WHERE pt.funnel_step = 'result' AND pt.completed_at >= p_since
  GROUP BY pt.field_key, pt.locale ORDER BY pt.field_key, pt.locale;
END;
$function$;
