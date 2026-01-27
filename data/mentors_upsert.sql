-- =============================================================
-- MENTOR UPSERT SCRIPT
-- =============================================================
-- This script updates/inserts mentors from data/mentors_seed.input.json
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new
-- =============================================================

-- =============================================================
-- STEP 1: PREFLIGHT VALIDATION QUERIES
-- Run these FIRST to understand current state
-- =============================================================

-- 1a. List all current mentors
SELECT id, name, linkedin_url, is_active, updated_at 
FROM public.mentors 
ORDER BY name;

-- 1b. Count active vs inactive
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
  COUNT(*) as total_count
FROM public.mentors;

-- 1c. Validate existing pillar values (should return 0 rows)
SELECT id, name, xima_pillars
FROM public.mentors
WHERE NOT (
  xima_pillars <@ ARRAY['computational_power', 'communication', 'knowledge', 'creativity', 'drive']::text[]
);

-- =============================================================
-- STEP 2: UPSERT MENTORS
-- Matching logic:
--   1. PRIMARY: linkedin_url (when not null)
--   2. FALLBACK: name (case-insensitive) if linkedin_url not present
-- =============================================================

-- -------------------------------------------------------------
-- MENTOR: Daniel Cracau
-- Match: linkedin_url = 'https://www.linkedin.com/in/daniel-cracau/'
-- -------------------------------------------------------------
INSERT INTO public.mentors (
  id, name, title, bio, profile_image_url, linkedin_url,
  specialties, xima_pillars, rating, is_active, updated_at
)
VALUES (
  gen_random_uuid(),
  'Daniel Cracau',
  'Entrepreneur and Kindness Advocate | Ex UN staff',
  'Enabling sustainable technologies through hard work, creativity, and win-win networking. Location: Linz, Upper Austria, Austria.',
  '/avatars/daniel-cracau.jpg',
  'https://www.linkedin.com/in/daniel-cracau/',
  ARRAY['Entrepreneurship', 'Sustainable technologies', 'Win-win networking', 'Kindness leadership'],
  ARRAY['communication', 'knowledge', 'computational_power'],
  5.0,
  true,
  now()
)
ON CONFLICT (linkedin_url) WHERE linkedin_url IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  profile_image_url = EXCLUDED.profile_image_url,
  specialties = EXCLUDED.specialties,
  xima_pillars = EXCLUDED.xima_pillars,
  rating = EXCLUDED.rating,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =============================================================
-- TEMPLATE: Add more mentors below (copy and modify)
-- =============================================================

-- -------------------------------------------------------------
-- MENTOR: [Name Here]
-- Match: linkedin_url = '[LinkedIn URL]'
-- -------------------------------------------------------------
-- INSERT INTO public.mentors (
--   id, name, title, bio, profile_image_url, linkedin_url,
--   specialties, xima_pillars, rating, is_active, updated_at
-- )
-- VALUES (
--   gen_random_uuid(),
--   '[Full Name]',
--   '[Title/Role]',
--   '[Bio text...]',
--   '/avatars/[filename].jpg',
--   '[LinkedIn URL]',
--   ARRAY['Specialty1', 'Specialty2'],
--   ARRAY['communication', 'knowledge'],  -- Valid: computational_power, communication, knowledge, creativity, drive
--   4.5,
--   true,
--   now()
-- )
-- ON CONFLICT (linkedin_url) WHERE linkedin_url IS NOT NULL
-- DO UPDATE SET
--   name = EXCLUDED.name,
--   title = EXCLUDED.title,
--   bio = EXCLUDED.bio,
--   profile_image_url = EXCLUDED.profile_image_url,
--   specialties = EXCLUDED.specialties,
--   xima_pillars = EXCLUDED.xima_pillars,
--   rating = EXCLUDED.rating,
--   is_active = EXCLUDED.is_active,
--   updated_at = now();

-- =============================================================
-- FALLBACK: For mentors WITHOUT linkedin_url (match by name)
-- =============================================================
-- Use this pattern when linkedin_url is not available:
--
-- UPDATE public.mentors SET
--   title = '[Title]',
--   bio = '[Bio]',
--   profile_image_url = '/avatars/[filename].jpg',
--   specialties = ARRAY['Specialty1'],
--   xima_pillars = ARRAY['communication'],
--   rating = 4.5,
--   is_active = true,
--   updated_at = now()
-- WHERE LOWER(name) = LOWER('[Mentor Name]');
--
-- If no match, INSERT manually:
-- INSERT INTO public.mentors (id, name, ...) VALUES (gen_random_uuid(), ...);

-- =============================================================
-- STEP 3: POST-UPSERT VERIFICATION
-- =============================================================

-- 3a. Verify all active mentors
SELECT id, name, title, linkedin_url, is_active, updated_at 
FROM public.mentors 
WHERE is_active = true
ORDER BY updated_at DESC;

-- 3b. Final count
SELECT COUNT(*) as active_mentor_count 
FROM public.mentors 
WHERE is_active = true;

-- 3c. Validate all pillars are valid
SELECT id, name, xima_pillars
FROM public.mentors
WHERE NOT (
  xima_pillars <@ ARRAY['computational_power', 'communication', 'knowledge', 'creativity', 'drive']::text[]
);
-- Should return 0 rows
