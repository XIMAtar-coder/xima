
CREATE TABLE IF NOT EXISTS shortlist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_goal_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES auth.users(id),
  total_score FLOAT NOT NULL DEFAULT 0,
  identity_score FLOAT DEFAULT 0,
  trajectory_score FLOAT DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  location_score FLOAT DEFAULT 0,
  credential_score FLOAT DEFAULT 0,
  ximatar_archetype TEXT,
  ximatar_level INTEGER DEFAULT 1,
  pillar_scores JSONB,
  trajectory_summary TEXT,
  engagement_level TEXT,
  location_match TEXT,
  availability TEXT,
  match_narrative TEXT,
  status TEXT DEFAULT 'shortlisted',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shortlist_goal ON shortlist_results(hiring_goal_id, total_score DESC);
CREATE INDEX idx_shortlist_business ON shortlist_results(business_id);
CREATE INDEX idx_shortlist_candidate ON shortlist_results(candidate_user_id);

ALTER TABLE shortlist_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business sees own shortlists" ON shortlist_results
  FOR SELECT USING (business_id = auth.uid());

CREATE POLICY "Service manages shortlists" ON shortlist_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);
