
-- Growth paths: personalized learning journeys
CREATE TABLE IF NOT EXISTS growth_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_title TEXT NOT NULL,
  path_objective TEXT,
  target_pillar TEXT NOT NULL,
  resources JSONB NOT NULL,
  growth_insight TEXT,
  next_milestone TEXT,
  status TEXT DEFAULT 'active',
  estimated_total_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_growth_paths_user ON growth_paths(user_id);
CREATE INDEX idx_growth_paths_status ON growth_paths(user_id, status);

ALTER TABLE growth_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own paths" ON growth_paths FOR ALL USING (auth.uid() = user_id);

-- Progress tracking for individual resources
CREATE TABLE IF NOT EXISTS growth_hub_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id UUID REFERENCES growth_paths(id) ON DELETE SET NULL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_title TEXT NOT NULL,
  resource_platform TEXT,
  resource_url TEXT,
  primary_pillar TEXT,
  status TEXT DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  test_config JSONB,
  test_answers JSONB,
  test_score INTEGER,
  test_passed BOOLEAN DEFAULT false,
  pillar_deltas JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_progress_user ON growth_hub_progress(user_id);
CREATE INDEX idx_progress_status ON growth_hub_progress(user_id, status);
CREATE INDEX idx_progress_path ON growth_hub_progress(path_id);

ALTER TABLE growth_hub_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON growth_hub_progress FOR ALL USING (auth.uid() = user_id);
