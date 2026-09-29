-- Anonymous benchmarks for the questionnaire: how long it takes and where the
-- average score of each pillar sits. Every completed test (guest or signed in)
-- leaves one row with no identifier at all: field, version, duration and the
-- five scores. Numbers are shown to candidates only once there are enough
-- tests (see assessment_benchmarks), so a handful of runs never becomes "the
-- average".
CREATE TABLE IF NOT EXISTS public.assessment_completions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  field_key text NOT NULL,
  version text NOT NULL,
  duration_seconds integer,
  computational_power numeric(4,2) NOT NULL,
  communication numeric(4,2) NOT NULL,
  knowledge numeric(4,2) NOT NULL,
  creativity numeric(4,2) NOT NULL,
  drive numeric(4,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_completions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS assessment_completions_field_version_idx
  ON public.assessment_completions (version, field_key);

CREATE OR REPLACE FUNCTION public.record_assessment_completion(
  p_field text, p_version text, p_duration_seconds integer, p_scores jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cp numeric := (p_scores->>'computational_power')::numeric;
  v_co numeric := (p_scores->>'communication')::numeric;
  v_kn numeric := (p_scores->>'knowledge')::numeric;
  v_cr numeric := (p_scores->>'creativity')::numeric;
  v_dr numeric := (p_scores->>'drive')::numeric;
  v_duration integer := p_duration_seconds;
BEGIN
  IF p_field NOT IN ('science_tech','business_leadership','arts_creative','service_ops','trades_operations','restaurant') THEN
    RAISE EXCEPTION 'unknown field';
  END IF;
  IF p_version IS NULL OR length(p_version) > 10 THEN
    RAISE EXCEPTION 'bad version';
  END IF;
  IF v_cp IS NULL OR v_co IS NULL OR v_kn IS NULL OR v_cr IS NULL OR v_dr IS NULL
     OR least(v_cp, v_co, v_kn, v_cr, v_dr) < 0 OR greatest(v_cp, v_co, v_kn, v_cr, v_dr) > 10 THEN
    RAISE EXCEPTION 'bad scores';
  END IF;
  -- A run shorter than 3 minutes or longer than 3 hours is not a timing.
  IF v_duration IS NOT NULL AND (v_duration < 180 OR v_duration > 10800) THEN
    v_duration := NULL;
  END IF;
  INSERT INTO public.assessment_completions
    (field_key, version, duration_seconds, computational_power, communication, knowledge, creativity, drive)
  VALUES (p_field, p_version, v_duration, v_cp, v_co, v_kn, v_cr, v_dr);
END;
$$;

-- Averages per pillar and the median duration, for all fields or one.
-- Below 30 tests the numbers stay null: the page says the comparison is
-- coming instead of showing an average made of three people.
CREATE OR REPLACE FUNCTION public.assessment_benchmarks(p_field text DEFAULT NULL, p_version text DEFAULT '2.0')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rows AS (
    SELECT * FROM public.assessment_completions
    WHERE version = p_version AND (p_field IS NULL OR field_key = p_field)
  ), agg AS (
    SELECT count(*) AS n,
           count(duration_seconds) AS n_timed,
           round(avg(computational_power), 1) AS cp, round(avg(communication), 1) AS co,
           round(avg(knowledge), 1) AS kn, round(avg(creativity), 1) AS cr, round(avg(drive), 1) AS dr,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds) AS median_seconds
    FROM rows
  )
  SELECT jsonb_build_object(
    'count', n,
    'min_count', 30,
    'averages', CASE WHEN n >= 30 THEN jsonb_build_object(
      'computational_power', cp, 'communication', co, 'knowledge', kn, 'creativity', cr, 'drive', dr) END,
    'median_minutes', CASE WHEN n_timed >= 30 THEN round((median_seconds / 60.0)::numeric) END
  ) FROM agg;
$$;

REVOKE ALL ON FUNCTION public.record_assessment_completion(text, text, integer, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.assessment_benchmarks(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_assessment_completion(text, text, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assessment_benchmarks(text, text) TO anon, authenticated;
