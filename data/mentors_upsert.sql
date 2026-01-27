-- ============================================================
-- MENTOR DATA UPSERT SCRIPT
-- ============================================================
-- 
-- HOW TO USE:
-- 1. Fill data/mentors_seed.input.json with real values
-- 2. Copy the UPDATE statements below
-- 3. Replace placeholders with your data
-- 4. Run in Supabase SQL Editor: https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new
--
-- IMPORTANT:
-- - Only UPDATE existing mentor IDs (no INSERT to avoid duplicates)
-- - updated_at is set automatically
-- ============================================================

-- ============================================================
-- PREFLIGHT CHECK (run first)
-- ============================================================
SELECT id, name, is_active, updated_at 
FROM public.mentors 
ORDER BY name;

-- ============================================================
-- VALIDATION: Check pillar values are valid
-- ============================================================
-- Valid xima_pillars: computational_power, communication, knowledge, creativity, drive
-- Run this after update to verify:
/*
SELECT id, name, xima_pillars
FROM public.mentors
WHERE NOT (
  xima_pillars <@ ARRAY['computational_power', 'communication', 'knowledge', 'creativity', 'drive']::text[]
);
-- Should return 0 rows if all pillars are valid
*/

-- ============================================================
-- UPDATE STATEMENTS (replace values from your JSON)
-- ============================================================

-- MENTOR 1
UPDATE public.mentors SET
  name = '{{NAME}}',
  title = '{{TITLE}}',
  bio = '{{BIO_TEXT}}',
  profile_image_url = '/avatars/{{FILENAME}}.jpg',
  linkedin_url = '{{LINKEDIN_URL}}',
  specialties = ARRAY['{{SPEC1}}', '{{SPEC2}}'],
  xima_pillars = ARRAY['{{PILLAR1}}', '{{PILLAR2}}', '{{PILLAR3}}'],
  rating = {{RATING}},
  experience_years = {{YEARS}},
  is_active = true,
  updated_at = now()
WHERE id = 'b58d9a69-93e0-4634-bffb-48e26d4fe922';

-- MENTOR 2
UPDATE public.mentors SET
  name = '{{NAME}}',
  title = '{{TITLE}}',
  bio = '{{BIO_TEXT}}',
  profile_image_url = '/avatars/{{FILENAME}}.jpg',
  linkedin_url = '{{LINKEDIN_URL}}',
  specialties = ARRAY['{{SPEC1}}', '{{SPEC2}}'],
  xima_pillars = ARRAY['{{PILLAR1}}', '{{PILLAR2}}', '{{PILLAR3}}'],
  rating = {{RATING}},
  experience_years = {{YEARS}},
  is_active = true,
  updated_at = now()
WHERE id = '8e51d44c-b96d-42d1-ac48-823f2cb8686b';

-- MENTOR 3
UPDATE public.mentors SET
  name = '{{NAME}}',
  title = '{{TITLE}}',
  bio = '{{BIO_TEXT}}',
  profile_image_url = '/avatars/{{FILENAME}}.jpg',
  linkedin_url = '{{LINKEDIN_URL}}',
  specialties = ARRAY['{{SPEC1}}', '{{SPEC2}}'],
  xima_pillars = ARRAY['{{PILLAR1}}', '{{PILLAR2}}', '{{PILLAR3}}'],
  rating = {{RATING}},
  experience_years = {{YEARS}},
  is_active = true,
  updated_at = now()
WHERE id = '8f879039-36cb-4367-8064-49ba9a9fdbf2';

-- MENTOR 4
UPDATE public.mentors SET
  name = '{{NAME}}',
  title = '{{TITLE}}',
  bio = '{{BIO_TEXT}}',
  profile_image_url = '/avatars/{{FILENAME}}.jpg',
  linkedin_url = '{{LINKEDIN_URL}}',
  specialties = ARRAY['{{SPEC1}}', '{{SPEC2}}'],
  xima_pillars = ARRAY['{{PILLAR1}}', '{{PILLAR2}}', '{{PILLAR3}}'],
  rating = {{RATING}},
  experience_years = {{YEARS}},
  is_active = true,
  updated_at = now()
WHERE id = '82eb1e7a-efb1-4170-931b-712db6e33ba8';

-- MENTOR 5
UPDATE public.mentors SET
  name = '{{NAME}}',
  title = '{{TITLE}}',
  bio = '{{BIO_TEXT}}',
  profile_image_url = '/avatars/{{FILENAME}}.jpg',
  linkedin_url = '{{LINKEDIN_URL}}',
  specialties = ARRAY['{{SPEC1}}', '{{SPEC2}}'],
  xima_pillars = ARRAY['{{PILLAR1}}', '{{PILLAR2}}', '{{PILLAR3}}'],
  rating = {{RATING}},
  experience_years = {{YEARS}},
  is_active = true,
  updated_at = now()
WHERE id = '928dbd7d-1d4f-4abd-b069-d6bb18fd725e';

-- MENTOR 6
UPDATE public.mentors SET
  name = '{{NAME}}',
  title = '{{TITLE}}',
  bio = '{{BIO_TEXT}}',
  profile_image_url = '/avatars/{{FILENAME}}.jpg',
  linkedin_url = '{{LINKEDIN_URL}}',
  specialties = ARRAY['{{SPEC1}}', '{{SPEC2}}'],
  xima_pillars = ARRAY['{{PILLAR1}}', '{{PILLAR2}}', '{{PILLAR3}}'],
  rating = {{RATING}},
  experience_years = {{YEARS}},
  is_active = true,
  updated_at = now()
WHERE id = 'c66de3f0-98bd-4f31-b1eb-89b9edcdb2fa';

-- ============================================================
-- POST-UPDATE VERIFICATION
-- ============================================================
SELECT id, name, title, rating, is_active, 
       array_length(specialties, 1) as specialty_count,
       array_length(xima_pillars, 1) as pillar_count,
       updated_at 
FROM public.mentors 
WHERE is_active = true
ORDER BY rating DESC;

-- Check for missing required fields
SELECT id, name,
  CASE WHEN name IS NULL OR name = '' THEN 'MISSING NAME' END as issue
FROM public.mentors
WHERE name IS NULL OR name = '';
