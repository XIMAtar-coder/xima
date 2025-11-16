-- Add missing fields to profiles table for complete XIMAtar assessment data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ximatar_id uuid REFERENCES public.ximatars(id),
ADD COLUMN IF NOT EXISTS ximatar_name text,
ADD COLUMN IF NOT EXISTS ximatar_image text,
ADD COLUMN IF NOT EXISTS drive_level text,
ADD COLUMN IF NOT EXISTS pillar_scores jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS strongest_pillar text,
ADD COLUMN IF NOT EXISTS weakest_pillar text,
ADD COLUMN IF NOT EXISTS ximatar_storytelling text,
ADD COLUMN IF NOT EXISTS ximatar_growth_path text,
ADD COLUMN IF NOT EXISTS creation_source text DEFAULT 'assessment';

-- Create index on ximatar_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_ximatar_id ON public.profiles(ximatar_id);

-- Update existing profiles with ximatar data from assessment_results
UPDATE public.profiles p
SET 
  ximatar_id = ar.ximatar_id,
  pillar_scores = ar.pillars,
  ximatar_storytelling = ar.rationale->>'storytelling',
  ximatar_growth_path = ar.rationale->>'growth_path'
FROM (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    ximatar_id, 
    pillars,
    rationale
  FROM public.assessment_results
  WHERE ximatar_id IS NOT NULL
  ORDER BY user_id, computed_at DESC
) ar
WHERE p.user_id = ar.user_id
  AND p.ximatar_id IS NULL;