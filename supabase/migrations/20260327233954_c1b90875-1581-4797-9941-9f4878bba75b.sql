
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add pillar vector columns to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pillar_vector vector(5);
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS requirement_vector vector(5);
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS strength_vector vector(5);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS pillar_vector_col vector(5);

-- Trigger to auto-compute pillar_vector when pillar_scores changes
CREATE OR REPLACE FUNCTION compute_pillar_vector()
RETURNS trigger AS $$
DECLARE
  scores jsonb;
BEGIN
  scores := COALESCE(NEW.pillar_scores, '{}'::jsonb);
  
  IF scores != '{}'::jsonb THEN
    NEW.pillar_vector := ARRAY[
      COALESCE((scores->>'drive')::float, 0) / 10.0,
      COALESCE((scores->>'computational_power')::float, (scores->>'comp_power')::float, 0) / 10.0,
      COALESCE((scores->>'communication')::float, 0) / 10.0,
      COALESCE((scores->>'creativity')::float, 0) / 10.0,
      COALESCE((scores->>'knowledge')::float, 0) / 10.0
    ]::vector(5);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pillar_vector ON profiles;
CREATE TRIGGER trg_pillar_vector
  BEFORE INSERT OR UPDATE OF pillar_scores
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION compute_pillar_vector();

-- Backfill existing profiles
UPDATE profiles SET pillar_vector = ARRAY[
  COALESCE((COALESCE(pillar_scores, '{}'::jsonb)->>'drive')::float, 0) / 10.0,
  COALESCE((COALESCE(pillar_scores, '{}'::jsonb)->>'computational_power')::float, 
           (COALESCE(pillar_scores, '{}'::jsonb)->>'comp_power')::float, 0) / 10.0,
  COALESCE((COALESCE(pillar_scores, '{}'::jsonb)->>'communication')::float, 0) / 10.0,
  COALESCE((COALESCE(pillar_scores, '{}'::jsonb)->>'creativity')::float, 0) / 10.0,
  COALESCE((COALESCE(pillar_scores, '{}'::jsonb)->>'knowledge')::float, 0) / 10.0
]::vector(5)
WHERE pillar_scores IS NOT NULL;

-- Intelligence patterns table
CREATE TABLE IF NOT EXISTS intelligence_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  archetype TEXT,
  target_pillar TEXT,
  difficulty TEXT,
  pattern_data JSONB NOT NULL,
  source_count INTEGER DEFAULT 1,
  confidence FLOAT DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patterns_lookup ON intelligence_patterns(pattern_type, archetype, target_pillar, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON intelligence_patterns(pattern_type);

ALTER TABLE intelligence_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages patterns" ON intelligence_patterns FOR ALL USING (true);

-- Intelligence deposits table
CREATE TABLE IF NOT EXISTS intelligence_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  deposit_type TEXT NOT NULL,
  deposit_data JSONB NOT NULL,
  pattern_id UUID REFERENCES intelligence_patterns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_function ON intelligence_deposits(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON intelligence_deposits(user_id);

ALTER TABLE intelligence_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages deposits" ON intelligence_deposits FOR ALL USING (true);

-- SQL function: Job matching via vector similarity
CREATE OR REPLACE FUNCTION match_jobs_by_vector(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  job_id UUID,
  role_title TEXT,
  company_name TEXT,
  similarity_score FLOAT,
  job_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jp.id AS job_id,
    jp.title AS role_title,
    bp.company_name,
    1 - (p.pillar_vector <=> jp.requirement_vector)::FLOAT AS similarity_score,
    jsonb_build_object(
      'description', jp.description,
      'location', jp.location,
      'requirements_must', jp.requirements_must,
      'seniority', jp.seniority,
      'employment_type', jp.employment_type
    ) AS job_data
  FROM profiles p
  JOIN job_posts jp ON jp.requirement_vector IS NOT NULL AND jp.status NOT IN ('draft','archived','closed')
  LEFT JOIN business_profiles bp ON bp.user_id = jp.business_id
  WHERE p.user_id = p_user_id
    AND p.pillar_vector IS NOT NULL
  ORDER BY p.pillar_vector <=> jp.requirement_vector ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SQL function: Mentor matching via gap analysis
CREATE OR REPLACE FUNCTION match_mentors_by_gap(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  mentor_id UUID,
  mentor_name TEXT,
  gap_fill_score FLOAT,
  mentor_data JSONB
) AS $$
DECLARE
  user_vector vector(5);
  ideal_vector vector(5);
BEGIN
  SELECT pillar_vector INTO user_vector FROM profiles WHERE user_id = p_user_id;
  
  IF user_vector IS NULL THEN
    RETURN;
  END IF;
  
  ideal_vector := ARRAY[
    1.0 - user_vector[1],
    1.0 - user_vector[2],
    1.0 - user_vector[3],
    1.0 - user_vector[4],
    1.0 - user_vector[5]
  ]::vector(5);
  
  RETURN QUERY
  SELECT 
    m.id AS mentor_id,
    m.name AS mentor_name,
    1 - (m.strength_vector <=> ideal_vector)::FLOAT AS gap_fill_score,
    jsonb_build_object(
      'specialties', m.specialties,
      'xima_pillars', m.xima_pillars,
      'bio', m.bio,
      'title', m.title
    ) AS mentor_data
  FROM mentors m
  WHERE m.strength_vector IS NOT NULL
    AND m.is_active = true
  ORDER BY m.strength_vector <=> ideal_vector ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SQL function: Find similar profiles
CREATE OR REPLACE FUNCTION find_similar_profiles(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  similar_user_id UUID,
  similarity FLOAT,
  archetype TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p2.user_id AS similar_user_id,
    1 - (p1.pillar_vector <=> p2.pillar_vector)::FLOAT AS similarity,
    (p2.ximatar_id)::TEXT AS archetype
  FROM profiles p1
  JOIN profiles p2 ON p2.user_id != p1.user_id AND p2.pillar_vector IS NOT NULL
  WHERE p1.user_id = p_user_id
    AND p1.pillar_vector IS NOT NULL
  ORDER BY p1.pillar_vector <=> p2.pillar_vector ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SQL function: Find matching patterns
CREATE OR REPLACE FUNCTION find_matching_patterns(
  p_pattern_type TEXT,
  p_archetype TEXT DEFAULT NULL,
  p_target_pillar TEXT DEFAULT NULL,
  p_min_confidence FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  pattern_id UUID,
  pattern_data JSONB,
  confidence FLOAT,
  source_count INTEGER,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id AS pattern_id,
    ip.pattern_data,
    ip.confidence,
    ip.source_count,
    ip.usage_count
  FROM intelligence_patterns ip
  WHERE ip.pattern_type = p_pattern_type
    AND ip.confidence >= p_min_confidence
    AND (p_archetype IS NULL OR ip.archetype = p_archetype OR ip.archetype IS NULL)
    AND (p_target_pillar IS NULL OR ip.target_pillar = p_target_pillar OR ip.target_pillar IS NULL)
  ORDER BY ip.confidence DESC, ip.usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
