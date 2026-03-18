-- CV Intelligence Engine v2.0 — credential extraction + identity analysis tables

-- Table 1: cv_credentials — structured facts for B2B matching
CREATE TABLE cv_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,
  nationality TEXT,
  date_of_birth TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  hard_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  total_years_experience INTEGER,
  seniority_level TEXT,
  industries_worked TEXT[] DEFAULT '{}',
  career_trajectory TEXT,
  cv_language TEXT,
  
  publications JSONB DEFAULT '[]'::jsonb,
  patents JSONB DEFAULT '[]'::jsonb,
  awards JSONB DEFAULT '[]'::jsonb,
  volunteer_work JSONB DEFAULT '[]'::jsonb,
  professional_associations TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_cv_credentials_seniority ON cv_credentials(seniority_level);
CREATE INDEX idx_cv_credentials_years ON cv_credentials(total_years_experience);
CREATE INDEX idx_cv_credentials_language ON cv_credentials(cv_language);
CREATE INDEX idx_cv_credentials_industries ON cv_credentials USING GIN(industries_worked);
CREATE INDEX idx_cv_credentials_hard_skills ON cv_credentials USING GIN(hard_skills);
CREATE INDEX idx_cv_credentials_education ON cv_credentials USING GIN(education);

ALTER TABLE cv_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credentials" ON cv_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own credentials" ON cv_credentials FOR ALL USING (auth.uid() = user_id);

-- Table 2: cv_identity_analysis — psychometric tension between CV and assessment
CREATE TABLE cv_identity_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  cv_archetype_primary TEXT NOT NULL,
  cv_archetype_secondary TEXT,
  cv_archetype_explanation TEXT,
  
  cv_pillar_scores JSONB NOT NULL,
  
  assessment_ximatar TEXT NOT NULL,
  assessment_pillar_scores JSONB NOT NULL,
  
  alignment_score INTEGER,
  tension_gaps JSONB,
  tension_narrative TEXT,
  
  technical_improvements JSONB,
  identity_improvements JSONB,
  
  cv_qualified_roles TEXT[] DEFAULT '{}',
  archetype_aligned_roles TEXT[] DEFAULT '{}',
  growth_bridge_roles TEXT[] DEFAULT '{}',
  
  mentor_suggested_focus TEXT,
  mentor_key_question TEXT,
  
  cv_language TEXT,
  analysis_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

ALTER TABLE cv_identity_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analysis" ON cv_identity_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own analysis" ON cv_identity_analysis FOR ALL USING (auth.uid() = user_id);