-- Security hardening: Restrict public access to business_challenges and mentors tables
-- Fixes: business_challenges_public_readable, mentors_public_exposure (2026-01-27)

-- =====================================================
-- FIX 1: business_challenges - Remove public is_public=true access
-- Business challenges should only be visible to:
--   1. The owning business
--   2. Candidates who have been invited to the challenge
-- =====================================================

-- Drop the overly permissive policy that allows is_public=true access
DROP POLICY IF EXISTS "Invited candidates can view challenge details" ON public.business_challenges;

-- Create a stricter policy: candidates can ONLY see challenges they are invited to
-- No public access even if is_public=true (that flag should be used for other purposes internally)
CREATE POLICY "Invited candidates can view their assigned challenges"
  ON public.business_challenges
  FOR SELECT
  TO authenticated
  USING (
    -- Business owner can always see their own challenges
    auth.uid() = business_id
    OR
    -- Candidates can see challenges they have been explicitly invited to
    EXISTS (
      SELECT 1
      FROM public.challenge_invitations ci
      JOIN public.profiles p ON p.id = ci.candidate_profile_id
      WHERE ci.challenge_id = business_challenges.id
        AND p.user_id = auth.uid()
    )
  );

-- Ensure the existing business owner policy is updated to target authenticated only
DROP POLICY IF EXISTS "Business users can view their own challenges" ON public.business_challenges;
-- (covered by the new combined policy above)

-- =====================================================
-- FIX 2: mentors - Remove anonymous access, require authentication
-- Mentors should only be visible to authenticated users
-- =====================================================

-- Drop the anon policy that exposes mentor data to unauthenticated scrapers
DROP POLICY IF EXISTS "Anon users can view active mentors" ON public.mentors;

-- Update the authenticated policy to be clearer
DROP POLICY IF EXISTS "Authenticated users can view active mentors" ON public.mentors;
CREATE POLICY "Authenticated users can view active mentors"
  ON public.mentors
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =====================================================
-- FIX 3: Update mentors_public view - remove anon grant
-- The view should only be accessible to authenticated users
-- =====================================================

-- Revoke anon access from the mentors_public view
REVOKE SELECT ON public.mentors_public FROM anon;

-- Add comment explaining the security change
COMMENT ON VIEW public.mentors_public IS 'Public view of active mentors for authenticated users only. Uses security_invoker=true to respect RLS. Anonymous access removed to prevent scraping of mentor data.';

-- =====================================================
-- VERIFICATION: Add comments to document security decisions
-- =====================================================

COMMENT ON TABLE public.business_challenges IS 'Business challenges for hiring goals. RLS restricts access to owning business and explicitly invited candidates only. The is_public column is for internal filtering, not public web access.';

COMMENT ON TABLE public.mentors IS 'Mentor profiles. RLS restricts SELECT to authenticated users only. Anonymous access removed to prevent data scraping.';