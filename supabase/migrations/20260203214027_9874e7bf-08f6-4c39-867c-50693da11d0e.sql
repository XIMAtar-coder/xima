-- Add missing columns to mentors table for enhanced mentor profiles
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS free_intro_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_intro_duration_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS paid_sessions_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_host_video_sessions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_reschedule_sessions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_candidate_cv BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_candidate_cv_consent BOOLEAN DEFAULT true;

-- Update mentors_public view to include new public fields (EXCLUDING email, user_id)
DROP VIEW IF EXISTS public.mentors_public;

CREATE VIEW public.mentors_public 
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  title,
  bio,
  profile_image_url,
  linkedin_url,
  specialties,
  xima_pillars,
  rating,
  is_active,
  first_session_expectations,
  active_coached_profiles_count,
  total_coached_profiles_count,
  languages,
  location,
  badges,
  free_intro_enabled,
  free_intro_duration_minutes,
  paid_sessions_enabled,
  can_host_video_sessions,
  updated_at
FROM public.mentors
WHERE is_active = true OR is_active IS NULL;

-- Comment to document security decision
COMMENT ON VIEW public.mentors_public IS 'Public mentor profiles. EXCLUDES email, user_id, and sensitive permission flags for privacy.';

-- Upsert Mentor 1: Roberta Fazzeri
INSERT INTO public.mentors (
  id,
  name,
  title,
  bio,
  specialties,
  xima_pillars,
  languages,
  location,
  badges,
  first_session_expectations,
  free_intro_enabled,
  free_intro_duration_minutes,
  paid_sessions_enabled,
  can_host_video_sessions,
  can_reschedule_sessions,
  can_view_candidate_cv,
  requires_candidate_cv_consent,
  profile_image_url,
  is_active,
  rating,
  email,
  created_at,
  updated_at
)
VALUES (
  '928dbd7d-1d4f-4abd-b069-d6bb18fd725e', -- Keep existing ID for Roberta
  'Roberta Fazzeri',
  'Biologa Nutrizionista & Research Coach',
  'Biologa Nutrizionista e ricercatrice con esperienza clinica e di ricerca in endocrinologia, nutrizione e stile di vita sano. Aiuto professionisti e studenti a orientarsi nella crescita professionale in ambito salute, nutrizione e scienze della vita.',
  ARRAY['Nutritional Coaching', 'Research Career Growth', 'Healthy Lifestyle Strategies'],
  ARRAY['knowledge', 'communication', 'creativity'],
  ARRAY['IT', 'EN'],
  'Bologna, Italy',
  ARRAY['Health & Nutrition', 'Research Coach', 'Career Transition'],
  'In questa prima sessione analizzeremo il tuo background, discuteremo le tue sfide principali e definiremo insieme 1–2 obiettivi concreti per sviluppare competenze e strategie di crescita personali e professionali.',
  true,  -- free_intro_enabled
  15,    -- free_intro_duration_minutes
  false, -- paid_sessions_enabled
  true,  -- can_host_video_sessions
  true,  -- can_reschedule_sessions
  false, -- can_view_candidate_cv
  true,  -- requires_candidate_cv_consent
  NULL,  -- no avatar
  true,
  4.70,
  'roberta.fazz@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  specialties = EXCLUDED.specialties,
  xima_pillars = EXCLUDED.xima_pillars,
  languages = EXCLUDED.languages,
  location = EXCLUDED.location,
  badges = EXCLUDED.badges,
  first_session_expectations = EXCLUDED.first_session_expectations,
  free_intro_enabled = EXCLUDED.free_intro_enabled,
  free_intro_duration_minutes = EXCLUDED.free_intro_duration_minutes,
  paid_sessions_enabled = EXCLUDED.paid_sessions_enabled,
  can_host_video_sessions = EXCLUDED.can_host_video_sessions,
  can_reschedule_sessions = EXCLUDED.can_reschedule_sessions,
  can_view_candidate_cv = EXCLUDED.can_view_candidate_cv,
  requires_candidate_cv_consent = EXCLUDED.requires_candidate_cv_consent,
  profile_image_url = EXCLUDED.profile_image_url,
  is_active = EXCLUDED.is_active,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Upsert Mentor 2: Pietro Cozzi (link to existing auth user)
INSERT INTO public.mentors (
  id,
  user_id,
  name,
  title,
  bio,
  specialties,
  xima_pillars,
  languages,
  location,
  badges,
  first_session_expectations,
  free_intro_enabled,
  free_intro_duration_minutes,
  paid_sessions_enabled,
  can_host_video_sessions,
  can_reschedule_sessions,
  can_view_candidate_cv,
  requires_candidate_cv_consent,
  profile_image_url,
  is_active,
  rating,
  email,
  created_at,
  updated_at
)
VALUES (
  '8f879039-36cb-4367-8064-49ba9a9fdbf2', -- Keep existing ID for Pietro
  'd1fe1ffd-f1a1-4ee4-a4d5-679e7f60e182', -- Link to existing auth user
  'Pietro Cozzi',
  'Business Strategy & Career Growth Mentor',
  'Business Manager con esperienza in consulenza, gestione progetti e sviluppo professionale. Supporto professionisti e startup a chiarire obiettivi di carriera, migliorare soft skills e definire strategie efficaci per crescita personale e professionale.',
  ARRAY['Career Coaching & Strategy', 'Project Management Guidance', 'Leadership Development'],
  ARRAY['knowledge', 'communication', 'creativity'],
  ARRAY['IT', 'EN'],
  'Bologna, Italy',
  ARRAY['Career Coach', 'Business Strategy', 'Leadership Mentor'],
  'In questo primo incontro esploreremo i tuoi obiettivi di carriera, identificheremo priorità e sfide e fisseremo 1–2 azioni immediate per migliorare la tua direzione professionale.',
  true,  -- free_intro_enabled
  15,    -- free_intro_duration_minutes
  false, -- paid_sessions_enabled
  true,  -- can_host_video_sessions
  true,  -- can_reschedule_sessions
  false, -- can_view_candidate_cv
  true,  -- requires_candidate_cv_consent
  NULL,  -- no avatar
  true,
  4.80,
  'cozzi.pietro94@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  specialties = EXCLUDED.specialties,
  xima_pillars = EXCLUDED.xima_pillars,
  languages = EXCLUDED.languages,
  location = EXCLUDED.location,
  badges = EXCLUDED.badges,
  first_session_expectations = EXCLUDED.first_session_expectations,
  free_intro_enabled = EXCLUDED.free_intro_enabled,
  free_intro_duration_minutes = EXCLUDED.free_intro_duration_minutes,
  paid_sessions_enabled = EXCLUDED.paid_sessions_enabled,
  can_host_video_sessions = EXCLUDED.can_host_video_sessions,
  can_reschedule_sessions = EXCLUDED.can_reschedule_sessions,
  can_view_candidate_cv = EXCLUDED.can_view_candidate_cv,
  requires_candidate_cv_consent = EXCLUDED.requires_candidate_cv_consent,
  profile_image_url = EXCLUDED.profile_image_url,
  is_active = EXCLUDED.is_active,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Deactivate unused test mentors (keep only Roberta and Pietro active)
UPDATE public.mentors
SET is_active = false, updated_at = NOW()
WHERE id NOT IN (
  '928dbd7d-1d4f-4abd-b069-d6bb18fd725e', -- Roberta
  '8f879039-36cb-4367-8064-49ba9a9fdbf2'  -- Pietro
)
AND id NOT IN (
  -- Keep mentors that have existing sessions/relationships
  SELECT DISTINCT mentor_id FROM public.appointments
  UNION
  SELECT DISTINCT mentor_id FROM public.mentor_coaching_relationships
);