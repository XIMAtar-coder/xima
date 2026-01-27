-- =====================================================
-- FIX 1: professionals table - restrict to authenticated users only
-- =====================================================

-- Drop any permissive anon policies
DROP POLICY IF EXISTS "Professionals are publicly viewable" ON public.professionals;
DROP POLICY IF EXISTS "Anon users can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Anyone can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Public can view professionals" ON public.professionals;

-- Ensure RLS is enabled
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Create authenticated-only SELECT policy
CREATE POLICY "Authenticated users can view professionals"
  ON public.professionals
  FOR SELECT
  TO authenticated
  USING (true);

-- Revoke anon access
REVOKE SELECT ON public.professionals FROM anon;

-- =====================================================
-- FIX 2: opportunities table - restrict to authenticated users only
-- =====================================================

-- Drop any permissive anon policies
DROP POLICY IF EXISTS "Opportunities are publicly viewable" ON public.opportunities;
DROP POLICY IF EXISTS "Anon users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Public can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Public opportunities are viewable" ON public.opportunities;

-- Ensure RLS is enabled
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Create authenticated-only SELECT policy for public opportunities
CREATE POLICY "Authenticated users can view public opportunities"
  ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Revoke anon access
REVOKE SELECT ON public.opportunities FROM anon;

-- =====================================================
-- FIX 3: feed_reactions table - fix contradictory policy
-- =====================================================

-- Drop the broken/contradictory policy
DROP POLICY IF EXISTS "No direct read of reactions" ON public.feed_reactions;
DROP POLICY IF EXISTS "Anyone can read reactions" ON public.feed_reactions;
DROP POLICY IF EXISTS "Anon users can read reactions" ON public.feed_reactions;
DROP POLICY IF EXISTS "Public can view reactions" ON public.feed_reactions;

-- Ensure RLS is enabled
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

-- Create a proper policy that actually blocks direct reads
-- Only allow users to read their own reactions (by reactor_hash matching their auth.uid())
CREATE POLICY "Users can only read their own reactions"
  ON public.feed_reactions
  FOR SELECT
  TO authenticated
  USING (reactor_hash = auth.uid()::text);

-- Revoke anon access completely
REVOKE SELECT ON public.feed_reactions FROM anon;

-- =====================================================
-- Verify: Revoke all anon privileges from sensitive tables
-- =====================================================
REVOKE ALL ON public.professionals FROM anon;
REVOKE ALL ON public.opportunities FROM anon;
REVOKE ALL ON public.feed_reactions FROM anon;