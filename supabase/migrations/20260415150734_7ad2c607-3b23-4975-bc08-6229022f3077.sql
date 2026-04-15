-- Remove overly permissive public SELECT policies on legacy professionals table
-- The app now uses mentors_public view for mentor discovery

-- Drop the broad public policies
DROP POLICY IF EXISTS "professionals: public read" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users can view professionals" ON public.professionals;

-- Add owner-only SELECT policy (needed for bookings RLS policy that references professionals)
CREATE POLICY "Professionals can view own record"
  ON public.professionals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add service_role full access for edge functions
CREATE POLICY "Service role full access to professionals"
  ON public.professionals
  FOR SELECT
  TO service_role
  USING (true);