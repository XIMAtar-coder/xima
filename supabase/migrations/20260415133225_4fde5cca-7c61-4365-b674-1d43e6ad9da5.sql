-- Step 1: Drop the broad SELECT policy that exposes email to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view active mentors via view" ON public.mentors;

-- Step 2: Recreate mentors_public view to include user_id (needed for joins) but still exclude email
DROP VIEW IF EXISTS public.mentors_public;
CREATE VIEW public.mentors_public
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
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
  active_coached_profiles_count,
  total_coached_profiles_count,
  languages,
  location,
  badges,
  free_intro_enabled,
  free_intro_duration_minutes,
  paid_sessions_enabled,
  can_host_video_sessions,
  updated_at
FROM public.mentors
WHERE is_active = true;

-- Step 3: Grant access to the view for authenticated and anon roles
GRANT SELECT ON public.mentors_public TO authenticated;
GRANT SELECT ON public.mentors_public TO anon;

-- Step 4: Add admin SELECT policy on admin_notifications so admins can read them
CREATE POLICY "Admins can read admin notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));