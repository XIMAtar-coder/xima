
-- =====================================================
-- Step 4.1: Audit Immutability + Alert Thresholds
-- =====================================================

-- 1. Immutability trigger: prevent UPDATE/DELETE on audit_events
CREATE OR REPLACE FUNCTION public.trg_audit_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is immutable: % operations are prohibited', TG_OP;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_events_no_update
BEFORE UPDATE ON public.audit_events
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_events_immutable();

CREATE TRIGGER trg_audit_events_no_delete
BEFORE DELETE ON public.audit_events
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_events_immutable();

-- 2. Retention policy placeholder (partition-ready, no auto-delete)
COMMENT ON TABLE public.audit_events IS 
'Immutable audit trail. UPDATE/DELETE blocked by trigger. Retention: indefinite by default. For partitioning, convert to range-partitioned table on occurred_at when volume exceeds 10M rows.';

-- 3. Alert threshold check functions (no external vendor)

-- 3a. Dead-letter emails in last 24h
CREATE OR REPLACE FUNCTION public.ops_check_dead_letters_24h()
RETURNS TABLE(alert_fired boolean, dead_letter_count numeric, threshold numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT 
    COALESCE(SUM(metric_value), 0) > 0 AS alert_fired,
    COALESCE(SUM(metric_value), 0) AS dead_letter_count,
    0::numeric AS threshold
  FROM public.metrics_daily
  WHERE metric_name = 'email.dead_letter'
    AND metric_date >= (CURRENT_DATE - 1);
$$;

-- 3b. Open-answer error rate > 2% in last 24h
CREATE OR REPLACE FUNCTION public.ops_check_scoring_error_rate_24h()
RETURNS TABLE(alert_fired boolean, error_count bigint, total_count bigint, error_rate numeric, threshold numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  WITH counts AS (
    SELECT
      COUNT(*) FILTER (WHERE action = 'assessment.open_answer_scored' AND (metadata->>'finalScore')::int IS NOT NULL) AS success,
      COUNT(*) FILTER (WHERE action IN ('assessment.open_answer_scored') AND metadata->>'error' IS NOT NULL) AS errors,
      COUNT(*) FILTER (WHERE action LIKE 'assessment.open_answer%') AS total
    FROM public.audit_events
    WHERE occurred_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT
    CASE WHEN total > 0 THEN (errors::numeric / total * 100) > 2 ELSE false END AS alert_fired,
    errors AS error_count,
    total AS total_count,
    CASE WHEN total > 0 THEN ROUND(errors::numeric / total * 100, 2) ELSE 0 END AS error_rate,
    2.0::numeric AS threshold
  FROM counts;
$$;

-- 3c. Assessment completion drop > 30% week-over-week
CREATE OR REPLACE FUNCTION public.ops_check_assessment_wow_drop()
RETURNS TABLE(alert_fired boolean, this_week numeric, last_week numeric, drop_pct numeric, threshold numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  WITH weekly AS (
    SELECT
      COALESCE(SUM(metric_value) FILTER (WHERE metric_date >= CURRENT_DATE - 7), 0) AS this_week,
      COALESCE(SUM(metric_value) FILTER (WHERE metric_date >= CURRENT_DATE - 14 AND metric_date < CURRENT_DATE - 7), 0) AS last_week
    FROM public.metrics_daily
    WHERE metric_name = 'assessment.completed'
  )
  SELECT
    CASE WHEN last_week > 0 THEN ((last_week - this_week) / last_week * 100) > 30 ELSE false END AS alert_fired,
    this_week,
    last_week,
    CASE WHEN last_week > 0 THEN ROUND((last_week - this_week) / last_week * 100, 1) ELSE 0 END AS drop_pct,
    30.0::numeric AS threshold
  FROM weekly;
$$;
