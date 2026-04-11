
-- Fix search_path on all 9 SECURITY DEFINER functions

ALTER FUNCTION public.create_mentor_chat_thread SET search_path = public;
ALTER FUNCTION public.feed_on_assessment_complete SET search_path = public;
ALTER FUNCTION public.feed_on_challenge_invitation SET search_path = public;
ALTER FUNCTION public.feed_on_cv_analysis SET search_path = public;
ALTER FUNCTION public.feed_on_growth_path SET search_path = public;
ALTER FUNCTION public.feed_on_growth_test SET search_path = public;
ALTER FUNCTION public.feed_on_new_message SET search_path = public;
ALTER FUNCTION public.feed_on_trajectory_update SET search_path = public;
ALTER FUNCTION public.increment_engagement SET search_path = public;

-- Fix overly permissive RLS policies

-- company_profiles: restrict INSERT to service_role
DROP POLICY IF EXISTS "Edge function can insert company profiles" ON public.company_profiles;
CREATE POLICY "Service role can insert company profiles"
  ON public.company_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- company_profiles: restrict UPDATE to service_role
DROP POLICY IF EXISTS "Service role can update own company profiles" ON public.company_profiles;
CREATE POLICY "Service role can update company profiles"
  ON public.company_profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- mentor_availability_slots: restrict UPDATE to service_role
DROP POLICY IF EXISTS "Service can update bookings" ON public.mentor_availability_slots;
CREATE POLICY "Service role can update bookings"
  ON public.mentor_availability_slots FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
