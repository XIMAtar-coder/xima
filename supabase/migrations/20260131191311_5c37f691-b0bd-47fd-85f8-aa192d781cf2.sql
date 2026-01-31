-- Fix: Recreate view with SECURITY INVOKER (not DEFINER) to use querying user's permissions
DROP VIEW IF EXISTS public.mentors_public;

CREATE VIEW public.mentors_public 
WITH (security_invoker = true) AS
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
  first_session_expectations,
  updated_at
FROM public.mentors
WHERE is_active = true;

-- Grant select on view to authenticated and anon users (public mentor listing)
GRANT SELECT ON public.mentors_public TO authenticated, anon;