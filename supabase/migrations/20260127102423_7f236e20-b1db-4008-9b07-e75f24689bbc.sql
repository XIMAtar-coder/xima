-- Hardened views: Add security_invoker = true to prevent RLS bypass (2026-01-27)
-- This fixes Supabase linter 0010_security_definer_view warnings
-- Views owned by postgres would otherwise bypass RLS on underlying tables

-- Fix mentors_public view
-- Purpose: Public mentor discovery for anon/authenticated users
-- Safe fields exposed: id, name, title, bio, profile_image_url, specialties, xima_pillars, rating, is_active, updated_at
-- NOT exposed: user_id, hourly_rate, availability, experience_years, company (sensitive/PII)
DROP VIEW IF EXISTS public.mentors_public;
CREATE VIEW public.mentors_public 
WITH (security_invoker = true) AS
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

-- Add documentation comment
COMMENT ON VIEW public.mentors_public IS 'Public view of active mentors exposing only safe fields for mentor selection UI. Uses security_invoker=true to respect RLS. Does not expose user_id, hourly_rate, availability, or other sensitive data. Public access via anon GRANT is intentional for mentor discovery.';

-- Fix feed_reaction_counts view
-- Purpose: Aggregated reaction counts for feed items (no PII exposed)
-- Safe fields exposed: feed_item_id, reaction_type, count
DROP VIEW IF EXISTS public.feed_reaction_counts;
CREATE VIEW public.feed_reaction_counts
WITH (security_invoker = true) AS
SELECT 
  feed_item_id,
  reaction_type,
  COUNT(*) as count
FROM public.feed_reactions
GROUP BY feed_item_id, reaction_type;

-- Grant access for feed functionality
GRANT SELECT ON public.feed_reaction_counts TO anon, authenticated;

-- Add documentation comment
COMMENT ON VIEW public.feed_reaction_counts IS 'Aggregated reaction counts per feed item. Uses security_invoker=true to respect RLS. Only exposes aggregate counts, no individual reactor identities.';

-- Since mentors_public now uses security_invoker, we need to ensure anon can SELECT from mentors (for active=true only)
-- Add RLS policy for anon users to see active mentors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mentors' AND policyname = 'Anon users can view active mentors'
  ) THEN
    CREATE POLICY "Anon users can view active mentors"
      ON public.mentors
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- Similarly for feed_reactions - anon needs to be able to see reactions for feed counts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feed_reactions' AND policyname = 'Anon users can view feed reactions'
  ) THEN
    CREATE POLICY "Anon users can view feed reactions"
      ON public.feed_reactions
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;