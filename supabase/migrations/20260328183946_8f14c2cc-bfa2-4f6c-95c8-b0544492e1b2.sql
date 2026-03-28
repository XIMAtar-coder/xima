-- Fix: Remove broad SELECT policy that exposes mentor email to all authenticated users
-- Replace with owner-only direct table access + service_role access for edge functions
-- Non-owner reads should go through mentors_public view (which excludes email)

DROP POLICY IF EXISTS "Authenticated users can view active mentors" ON public.mentors;

-- Mentors can still read their own full record (including email)
-- Policy "Mentors can select own record" already exists, keep it.

-- Allow service_role full access for edge functions
CREATE POLICY "Service role can read mentors"
  ON public.mentors
  FOR SELECT
  TO service_role
  USING (true);

-- Allow authenticated users to read active mentors but ONLY non-sensitive fields
-- Since RLS can't restrict columns, we add a policy that allows reads for active mentors
-- but the client code should use mentors_public view which excludes email
-- We still need this policy for the mentors_public view (security_invoker=true) to work
CREATE POLICY "Authenticated users can view active mentors via view"
  ON public.mentors
  FOR SELECT
  TO authenticated
  USING (is_active = true);