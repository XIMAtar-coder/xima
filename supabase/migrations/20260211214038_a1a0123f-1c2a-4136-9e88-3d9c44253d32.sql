
-- =========================================================
-- 1) pillar_progress_snapshots table
-- =========================================================
CREATE TABLE public.pillar_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('assessment_initial','mentor_session_completed','challenge_completed','assessment_retest')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  pillar_scores jsonb NOT NULL,
  metadata jsonb NULL
);

CREATE INDEX idx_pillar_progress_user_time ON public.pillar_progress_snapshots (user_id, occurred_at DESC);

ALTER TABLE public.pillar_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON public.pillar_progress_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.pillar_progress_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 2) Add drive cache columns to profiles
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS drive_score integer NULL,
  ADD COLUMN IF NOT EXISTS drive_updated_at timestamptz NULL;

-- =========================================================
-- 3) compute_drive_score function
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_drive_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_snapshots jsonb[];
  v_count integer;
  v_baseline jsonb;
  v_latest jsonb;
  v_baseline_time timestamptz;
  v_latest_time timestamptz;
  v_pillars text[] := ARRAY['communication','knowledge','creativity','computational_power'];
  v_scores numeric[];
  v_sorted_indices integer[];
  v_weak_set text[];
  v_delta numeric;
  v_time_days numeric;
  v_velocity numeric;
  v_sum_velocity numeric := 0;
  v_avg_weakest numeric;
  v_avg_strongest numeric;
  v_score integer;
  v_i integer;
  v_p text;
  v_rec record;
  v_baseline_scores numeric[];
  v_latest_scores numeric[];
BEGIN
  -- Get last 6 snapshots ordered by time
  SELECT count(*) INTO v_count
  FROM public.pillar_progress_snapshots
  WHERE user_id = p_user_id;

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Get baseline (earliest)
  SELECT pillar_scores, occurred_at INTO v_baseline, v_baseline_time
  FROM public.pillar_progress_snapshots
  WHERE user_id = p_user_id
  ORDER BY occurred_at ASC
  LIMIT 1;

  IF v_count = 1 THEN
    -- Fallback: compute from gap between strongest and weakest
    v_baseline_scores := ARRAY[
      COALESCE((v_baseline->>'communication')::numeric, 0),
      COALESCE((v_baseline->>'knowledge')::numeric, 0),
      COALESCE((v_baseline->>'creativity')::numeric, 0),
      COALESCE((v_baseline->>'computational_power')::numeric, 0)
    ];
    -- Sort ascending
    SELECT array_agg(val ORDER BY val ASC) INTO v_baseline_scores
    FROM unnest(v_baseline_scores) AS val;

    v_avg_weakest := (v_baseline_scores[1] + v_baseline_scores[2]) / 2.0;
    v_avg_strongest := (v_baseline_scores[3] + v_baseline_scores[4]) / 2.0;

    v_score := LEAST(100, GREATEST(0, round(60 - (v_avg_strongest - v_avg_weakest) * 2)));
    RETURN v_score;
  END IF;

  -- Get latest snapshot
  SELECT pillar_scores, occurred_at INTO v_latest, v_latest_time
  FROM public.pillar_progress_snapshots
  WHERE user_id = p_user_id
  ORDER BY occurred_at DESC
  LIMIT 1;

  -- Get baseline pillar scores
  v_baseline_scores := ARRAY[
    COALESCE((v_baseline->>'communication')::numeric, 0),
    COALESCE((v_baseline->>'knowledge')::numeric, 0),
    COALESCE((v_baseline->>'creativity')::numeric, 0),
    COALESCE((v_baseline->>'computational_power')::numeric, 0)
  ];

  -- Identify weak set (bottom 2 at baseline)
  -- Build array of (pillar, score) sorted ascending
  v_weak_set := ARRAY[]::text[];
  FOR v_rec IN
    SELECT pillar_name, score
    FROM (
      VALUES
        ('communication', COALESCE((v_baseline->>'communication')::numeric, 0)),
        ('knowledge', COALESCE((v_baseline->>'knowledge')::numeric, 0)),
        ('creativity', COALESCE((v_baseline->>'creativity')::numeric, 0)),
        ('computational_power', COALESCE((v_baseline->>'computational_power')::numeric, 0))
    ) AS t(pillar_name, score)
    ORDER BY score ASC
    LIMIT 2
  LOOP
    v_weak_set := array_append(v_weak_set, v_rec.pillar_name);
  END LOOP;

  -- Compute velocity for each weak pillar
  v_time_days := GREATEST(1, EXTRACT(EPOCH FROM (v_latest_time - v_baseline_time)) / 86400.0);
  v_sum_velocity := 0;

  FOREACH v_p IN ARRAY v_weak_set LOOP
    v_delta := COALESCE((v_latest->>v_p)::numeric, 0) - COALESCE((v_baseline->>v_p)::numeric, 0);
    v_velocity := v_delta / v_time_days;
    v_sum_velocity := v_sum_velocity + v_velocity;
  END LOOP;

  v_sum_velocity := v_sum_velocity / array_length(v_weak_set, 1);

  -- Normalize: target_velocity = 0.20 points/day
  v_score := LEAST(100, GREATEST(0, round(50 + (v_sum_velocity / 0.20) * 25)));

  RETURN v_score;
END;
$$;

-- =========================================================
-- 4) Safe wrapper for client
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_drive_for_current_user()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT public.compute_drive_score(auth.uid());
$$;

-- =========================================================
-- 5) Trigger to update profiles.drive_score on snapshot insert
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_drive_on_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_drive integer;
BEGIN
  v_drive := public.compute_drive_score(NEW.user_id);

  UPDATE public.profiles
  SET drive_score = v_drive,
      drive_updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_drive_on_snapshot
  AFTER INSERT ON public.pillar_progress_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_drive_on_snapshot();
