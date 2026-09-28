-- Mentor cards: text in the reader's language, the fields a mentor works in,
-- and only the pillars their profile supports. Before this the two active
-- mentors had three pillars out of four each and no field, so every
-- candidate saw both with a high affinity (e.g. a nutritionist at 89% for a
-- software engineer).
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS title_i18n jsonb,
  ADD COLUMN IF NOT EXISTS bio_i18n jsonb,
  ADD COLUMN IF NOT EXISTS specialties_i18n jsonb;

CREATE OR REPLACE VIEW public.mentors_public WITH (security_invoker = true) AS
 SELECT id, user_id, name, title, bio, profile_image_url, linkedin_url, specialties, xima_pillars,
    rating, is_active, first_session_expectations, active_coached_profiles_count, total_coached_profiles_count,
    languages, location, badges, free_intro_enabled, free_intro_duration_minutes, paid_sessions_enabled,
    can_host_video_sessions, updated_at,
    fields, title_i18n, bio_i18n, specialties_i18n
   FROM public.mentors
  WHERE is_active = true;

-- Only what the existing profiles say, rewritten per language.
UPDATE public.mentors SET
  fields = ARRAY['science_tech', 'business_leadership'],
  xima_pillars = ARRAY['computational_power', 'knowledge'],
  title_i18n = '{"it":"Tecnologia e strategia","en":"Technology & Strategy","es":"Tecnología y estrategia"}'::jsonb,
  bio_i18n = '{"it":"Tecnologia, strategia e trasformazione digitale.","en":"Technology, strategy and digital transformation.","es":"Tecnología, estrategia y transformación digital."}'::jsonb,
  specialties_i18n = '{"it":["Tecnologia","Strategia","Trasformazione digitale"],"en":["Technology","Strategy","Digital transformation"],"es":["Tecnología","Estrategia","Transformación digital"]}'::jsonb
WHERE name = 'Daniel Cracau';

UPDATE public.mentors SET
  fields = ARRAY['service_ops', 'science_tech'],
  xima_pillars = ARRAY['knowledge', 'communication'],
  title_i18n = '{"it":"Biologa nutrizionista e research coach","en":"Nutritionist biologist & research coach","es":"Bióloga nutricionista y research coach"}'::jsonb,
  bio_i18n = '{"it":"Biologa nutrizionista e ricercatrice con esperienza clinica e di ricerca in endocrinologia, nutrizione e stile di vita sano. Aiuta professionisti e studenti a orientarsi nella crescita professionale in ambito salute, nutrizione e scienze della vita.","en":"Nutritionist biologist and researcher with clinical and research experience in endocrinology, nutrition and healthy lifestyle. She helps professionals and students find their way in careers in health, nutrition and life sciences.","es":"Bióloga nutricionista e investigadora con experiencia clínica y de investigación en endocrinología, nutrición y estilo de vida saludable. Ayuda a profesionales y estudiantes a orientarse en su carrera en salud, nutrición y ciencias de la vida."}'::jsonb,
  specialties_i18n = '{"it":["Coaching nutrizionale","Carriera nella ricerca","Salute e stile di vita"],"en":["Nutritional coaching","Research careers","Health and lifestyle"],"es":["Coaching nutricional","Carrera en investigación","Salud y estilo de vida"]}'::jsonb
WHERE name = 'Roberta Fazzeri';
