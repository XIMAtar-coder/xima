-- Create a safe public view for mentors that exposes only non-sensitive fields
-- This allows guest/pre-signup users to see available mentors after assessment

CREATE OR REPLACE VIEW public.mentors_public AS
SELECT
  id,
  name,
  title,
  bio,
  profile_image_url,
  specialties,
  xima_pillars,
  rating,
  is_active,
  updated_at
FROM public.mentors
WHERE is_active = true;

-- Grant SELECT access to both anonymous and authenticated users
GRANT SELECT ON public.mentors_public TO anon, authenticated;

-- Add a comment for documentation
COMMENT ON VIEW public.mentors_public IS 'Public view of active mentors exposing only safe fields for mentor selection UI. Does not expose user_id, hourly_rate, availability, or other sensitive data.';