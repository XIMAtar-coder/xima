-- ============================================================
-- MENTOR DATA UPSERT SCRIPT
-- ============================================================
-- 
-- HOW TO USE:
-- 1. Fill data/mentors_seed.input.json with real mentor data
-- 2. Generate UPDATE statements from your JSON (one per mentor)
-- 3. Run in Supabase SQL Editor: https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new
--
-- IMPORTANT RULES:
-- - This script only UPDATES existing mentor rows (no INSERT)
-- - IDs MUST already exist in the database
-- - Mentor count is FLEXIBLE — add/remove UPDATE blocks as needed
-- - Mentors NOT included in this script remain unchanged
-- - Set is_active = false to hide a mentor (do NOT delete rows)
-- ============================================================

-- ============================================================
-- PREFLIGHT CHECK (run first to see current mentors)
-- ============================================================
SELECT id, name, is_active, updated_at 
FROM public.mentors 
ORDER BY name;

-- ============================================================
-- VALIDATION: Check pillar values are valid
-- ============================================================
-- Valid xima_pillars: computational_power, communication, knowledge, creativity, drive
-- Run AFTER updates to verify:
/*
SELECT id, name, xima_pillars
FROM public.mentors
WHERE NOT (
  xima_pillars <@ ARRAY['computational_power', 'communication', 'knowledge', 'creativity', 'drive']::text[]
);
-- Should return 0 rows if all pillars are valid
*/

-- ============================================================
-- UPDATE TEMPLATE (copy this block for each mentor)
-- ============================================================
-- Replace placeholders with real values from your JSON.
-- Add as many blocks as you have mentors — no fixed count.
-- 
-- CRITICAL: The WHERE clause ID must match an existing row.
-- If the ID doesn't exist, the statement will update 0 rows (safe fail).

/*
UPDATE public.mentors SET
  name = 'Full Name',
  title = 'Role / Title',
  bio = 'Biography text here',
  profile_image_url = '/avatars/firstname-lastname.jpg',
  linkedin_url = 'https://linkedin.com/in/handle',
  specialties = ARRAY['specialty1', 'specialty2'],
  xima_pillars = ARRAY['communication', 'drive', 'knowledge'],
  rating = 4.5,
  experience_years = 10,
  is_active = true,
  updated_at = now()
WHERE id = 'EXISTING_UUID_FROM_DB';
*/

-- ============================================================
-- YOUR MENTOR UPDATES (paste real values below)
-- ============================================================

-- MENTOR 1 (example — replace with real data)
-- UPDATE public.mentors SET
--   name = 'Jane Doe',
--   title = 'Career Coach',
--   bio = 'Expert in leadership and communication skills.',
--   profile_image_url = '/avatars/jane-doe.jpg',
--   linkedin_url = 'https://linkedin.com/in/janedoe',
--   specialties = ARRAY['leadership', 'communication'],
--   xima_pillars = ARRAY['communication', 'drive'],
--   rating = 4.8,
--   experience_years = 12,
--   is_active = true,
--   updated_at = now()
-- WHERE id = 'b58d9a69-93e0-4634-bffb-48e26d4fe922';

-- MENTOR 2 (add more blocks as needed)
-- UPDATE public.mentors SET ...
-- WHERE id = '...';

-- ============================================================
-- POST-UPDATE VERIFICATION
-- ============================================================
-- Run after updates to confirm data:

SELECT id, name, title, rating, is_active, 
       array_length(specialties, 1) as specialty_count,
       array_length(xima_pillars, 1) as pillar_count,
       updated_at 
FROM public.mentors 
WHERE is_active = true
ORDER BY rating DESC NULLS LAST;

-- Check for missing required fields:
SELECT id, name,
  CASE WHEN name IS NULL OR name = '' THEN 'MISSING NAME' END as issue
FROM public.mentors
WHERE is_active = true AND (name IS NULL OR name = '');

-- Count active mentors:
SELECT COUNT(*) as active_mentor_count 
FROM public.mentors 
WHERE is_active = true;
