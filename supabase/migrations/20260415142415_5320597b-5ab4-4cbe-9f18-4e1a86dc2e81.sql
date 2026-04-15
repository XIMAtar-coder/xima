ALTER TABLE public.hiring_goal_drafts
  ADD COLUMN IF NOT EXISTS required_skills jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nice_to_have_skills jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS years_experience_min integer,
  ADD COLUMN IF NOT EXISTS years_experience_max integer,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS original_seniority text;

ALTER TABLE public.hiring_goal_drafts ADD CONSTRAINT hiring_goal_education_level_check
  CHECK (education_level IS NULL OR education_level IN
    ('none_required','high_school','bachelor','master','phd'));