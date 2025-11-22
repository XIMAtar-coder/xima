-- Add cv_scores column to profiles table to store CV analysis results
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cv_scores JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.cv_scores IS 'Stores CV-derived pillar scores from AI analysis';