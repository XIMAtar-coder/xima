-- Pillar Trajectory Engine — v1.0

-- Table: records every pillar delta event
CREATE TABLE pillar_trajectory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_function TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_entity_id TEXT,
  correlation_id TEXT,
  drive_delta NUMERIC(4,1) DEFAULT 0,
  computational_power_delta NUMERIC(4,1) DEFAULT 0,
  communication_delta NUMERIC(4,1) DEFAULT 0,
  creativity_delta NUMERIC(4,1) DEFAULT 0,
  knowledge_delta NUMERIC(4,1) DEFAULT 0,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trajectory_user ON pillar_trajectory_log(user_id);
CREATE INDEX idx_trajectory_created ON pillar_trajectory_log(user_id, created_at DESC);
CREATE INDEX idx_trajectory_source ON pillar_trajectory_log(source_function);
CREATE INDEX idx_trajectory_source_type ON pillar_trajectory_log(source_type);
CREATE INDEX idx_trajectory_user_type ON pillar_trajectory_log(user_id, source_type);

ALTER TABLE pillar_trajectory_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trajectory" ON pillar_trajectory_log FOR SELECT USING (auth.uid() = user_id);

-- Add XIMAtar level and evolution columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ximatar_level') THEN
    ALTER TABLE profiles ADD COLUMN ximatar_level INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level_start_scores') THEN
    ALTER TABLE profiles ADD COLUMN level_start_scores JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level_started_at') THEN
    ALTER TABLE profiles ADD COLUMN level_started_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level_up_eligible') THEN
    ALTER TABLE profiles ADD COLUMN level_up_eligible BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'evolution_eligible') THEN
    ALTER TABLE profiles ADD COLUMN evolution_eligible BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suggested_new_archetype') THEN
    ALTER TABLE profiles ADD COLUMN suggested_new_archetype TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'archetype_history') THEN
    ALTER TABLE profiles ADD COLUMN archetype_history JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add evaluation_lens and expected_tensions to business_challenges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_challenges' AND column_name = 'evaluation_lens') THEN
    ALTER TABLE business_challenges ADD COLUMN evaluation_lens JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_challenges' AND column_name = 'expected_tensions') THEN
    ALTER TABLE business_challenges ADD COLUMN expected_tensions JSONB;
  END IF;
END $$;