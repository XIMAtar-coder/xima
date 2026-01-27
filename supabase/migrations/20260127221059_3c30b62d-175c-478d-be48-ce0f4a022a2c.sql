-- Add linkedin_url column to mentors table
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS linkedin_url text;

-- Drop and recreate mentors_public view with linkedin_url included
DROP VIEW IF EXISTS public.mentors_public;

CREATE VIEW public.mentors_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  title,
  bio,
  profile_image_url,
  linkedin_url,
  specialties,
  xima_pillars,
  rating,
  is_active,
  updated_at
FROM public.mentors
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.mentors_public TO anon;
GRANT SELECT ON public.mentors_public TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.mentors_public IS 'Public-safe view of active mentors for guest/unauthenticated users';