ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_locations JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_preference TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS willing_to_relocate TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_expectation JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry_preferences TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;