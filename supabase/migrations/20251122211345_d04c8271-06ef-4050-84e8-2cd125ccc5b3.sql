-- Add cv_comments column to profiles table to store AI-generated commentary
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_comments JSONB DEFAULT NULL;

COMMENT ON COLUMN profiles.cv_comments IS 'AI-generated commentary explaining CV scores for each pillar';