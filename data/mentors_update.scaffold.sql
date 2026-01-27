-- ============================================================
-- MENTOR DATA UPDATE SCAFFOLD
-- ============================================================
-- This is a TEMPLATE for updating mentor data.
-- Replace placeholder values with real data before running.
-- 
-- PREFLIGHT CHECK (run first to verify current state):
-- SELECT id, name, is_active, updated_at FROM public.mentors ORDER BY updated_at DESC;
--
-- DRY RUN: Test with ONE mentor first before running all.
-- ============================================================

-- MENTOR 1: Pietro Martinelli
UPDATE public.mentors SET
  name = 'Pietro Martinelli',
  title = 'Innovation & Creativity Coach',
  bio = '{{ REPLACE_WITH_ITALIAN_BIO_OR_ENGLISH_FALLBACK }}',
  profile_image_url = '/avatars/pietro-martinelli.jpg',
  linkedin_url = 'https://linkedin.com/in/{{ LINKEDIN_HANDLE }}',
  specialties = ARRAY['Innovation', 'Design Thinking', 'Creativity', 'Strategic Planning'],
  xima_pillars = ARRAY['creativity', 'communication', 'drive'],
  rating = 4.8,
  experience_years = 10,
  is_active = true,
  updated_at = now()
WHERE id = 'b58d9a69-93e0-4634-bffb-48e26d4fe922';

-- MENTOR 2: Dr. Maria Rossi
UPDATE public.mentors SET
  name = 'Dr. Maria Rossi',
  title = 'Senior Career Coach & Leadership Expert',
  bio = '{{ REPLACE_WITH_ITALIAN_BIO_OR_ENGLISH_FALLBACK }}',
  profile_image_url = '/avatars/maria-rossi.jpg',
  linkedin_url = 'https://linkedin.com/in/{{ LINKEDIN_HANDLE }}',
  specialties = ARRAY['Career Development', 'Leadership', 'Technical Skills', 'Communication'],
  xima_pillars = ARRAY['communication', 'drive', 'knowledge'],
  rating = 4.7,
  experience_years = 15,
  is_active = true,
  updated_at = now()
WHERE id = '8e51d44c-b96d-42d1-ac48-823f2cb8686b';

-- MENTOR 3: Pietro Cozzi
UPDATE public.mentors SET
  name = 'Pietro Cozzi',
  title = 'Product & Growth Leader',
  bio = '{{ REPLACE_WITH_ITALIAN_BIO_OR_ENGLISH_FALLBACK }}',
  profile_image_url = '/avatars/pietro-cozzi.jpg',
  linkedin_url = 'https://linkedin.com/in/{{ LINKEDIN_HANDLE }}',
  specialties = ARRAY['Leadership', 'GTM', 'Product Strategy'],
  xima_pillars = ARRAY['drive', 'communication', 'knowledge'],
  rating = 4.8,
  experience_years = 10,
  is_active = true,
  updated_at = now()
WHERE id = '8f879039-36cb-4367-8064-49ba9a9fdbf2';

-- MENTOR 4: Daniel Cracau
UPDATE public.mentors SET
  name = 'Daniel Cracau',
  title = 'Technology & Strategy',
  bio = '{{ REPLACE_WITH_ITALIAN_BIO_OR_ENGLISH_FALLBACK }}',
  profile_image_url = '/avatars/daniel-cracau.jpg',
  linkedin_url = 'https://linkedin.com/in/{{ LINKEDIN_HANDLE }}',
  specialties = ARRAY['Technology', 'Strategy', 'Digital Transformation'],
  xima_pillars = ARRAY['computational_power', 'knowledge', 'creativity'],
  rating = 4.9,
  experience_years = 15,
  is_active = true,
  updated_at = now()
WHERE id = '82eb1e7a-efb1-4170-931b-712db6e33ba8';

-- MENTOR 5: Roberta Fazzeri
UPDATE public.mentors SET
  name = 'Roberta Fazzeri',
  title = 'People & Culture Advisor',
  bio = '{{ REPLACE_WITH_ITALIAN_BIO_OR_ENGLISH_FALLBACK }}',
  profile_image_url = '/avatars/roberta-fazzeri.jpg',
  linkedin_url = 'https://linkedin.com/in/{{ LINKEDIN_HANDLE }}',
  specialties = ARRAY['Talent Development', 'Career Coaching', 'HR Strategy'],
  xima_pillars = ARRAY['communication', 'knowledge', 'creativity'],
  rating = 4.7,
  experience_years = 12,
  is_active = true,
  updated_at = now()
WHERE id = '928dbd7d-1d4f-4abd-b069-d6bb18fd725e';

-- MENTOR 6: Daniel Rodriguez
UPDATE public.mentors SET
  name = 'Daniel Rodriguez',
  title = 'Data Science & Analytics',
  bio = '{{ REPLACE_WITH_ITALIAN_BIO_OR_ENGLISH_FALLBACK }}',
  profile_image_url = '/avatars/daniel-rodriguez.jpg',
  linkedin_url = 'https://linkedin.com/in/{{ LINKEDIN_HANDLE }}',
  specialties = ARRAY['Data Science', 'Analytics', 'Machine Learning'],
  xima_pillars = ARRAY['computational_power', 'knowledge', 'drive'],
  rating = 4.6,
  experience_years = 10,
  is_active = true,
  updated_at = now()
WHERE id = 'c66de3f0-98bd-4f31-b1eb-89b9edcdb2fa';

-- ============================================================
-- VERIFICATION (run after updates):
-- SELECT id, name, title, rating, is_active, updated_at 
-- FROM public.mentors 
-- ORDER BY rating DESC;
-- ============================================================
