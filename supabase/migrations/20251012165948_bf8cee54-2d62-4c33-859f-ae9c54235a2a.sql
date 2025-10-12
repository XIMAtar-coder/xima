-- ============================================
-- XIMA PRODUCTION DATABASE SCHEMA
-- ============================================

-- 1. CREATE ENUMS
DO $$ BEGIN
  CREATE TYPE ximatar_type AS ENUM (
    'lion','owl','dolphin','fox','bear','cat','bee','parrot','elephant','wolf','chameleon','horse'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lang_code AS ENUM ('it','en','es');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. EXTEND PROFILES TABLE
-- Add new columns to existing profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email text UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS preferred_lang lang_code DEFAULT 'it',
  ADD COLUMN IF NOT EXISTS ximatar ximatar_type;

-- Backfill email from auth.users if possible
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id AND p.email IS NULL;

-- 3. I18N SYSTEM
CREATE TABLE IF NOT EXISTS public.i18n_keys (
  key text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.i18n_translations (
  key text REFERENCES public.i18n_keys(key) ON DELETE CASCADE,
  lang lang_code NOT NULL,
  text_value text NOT NULL,
  PRIMARY KEY (key, lang)
);

-- 4. EXTEND ASSESSMENTS
-- Add columns to existing assessments table
ALTER TABLE public.assessments 
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- 5. ASSESSMENT SCORES (detailed pillar breakdown)
CREATE TABLE IF NOT EXISTS public.assessment_scores (
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  pillar text CHECK (pillar IN ('computational_power','communication','knowledge','creativity','drive')),
  score numeric(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  PRIMARY KEY (assessment_id, pillar)
);

ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_scores: owner" ON public.assessment_scores;
CREATE POLICY "assessment_scores: owner" ON public.assessment_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

-- 6. USER SCORES (current snapshot for dashboard)
CREATE TABLE IF NOT EXISTS public.user_scores (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  computational_power numeric(4,2) NOT NULL DEFAULT 0,
  communication numeric(4,2) NOT NULL DEFAULT 0,
  knowledge numeric(4,2) NOT NULL DEFAULT 0,
  creativity numeric(4,2) NOT NULL DEFAULT 0,
  drive numeric(4,2) NOT NULL DEFAULT 0,
  match_quality_pct numeric(5,2) NOT NULL DEFAULT 0,
  assessments_completed int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_scores: owner" ON public.user_scores;
CREATE POLICY "user_scores: owner" ON public.user_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. MENTOR MATCHES (mentee -> mentor assignment)
CREATE TABLE IF NOT EXISTS public.mentor_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by text DEFAULT 'system',
  reason jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (mentee_user_id, mentor_user_id)
);

ALTER TABLE public.mentor_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_matches: mentee read" ON public.mentor_matches;
CREATE POLICY "mentor_matches: mentee read" ON public.mentor_matches
  FOR SELECT USING (auth.uid() = mentee_user_id OR auth.uid() = mentor_user_id);

-- 8. CHAT SYSTEM
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_group boolean NOT NULL DEFAULT false,
  topic text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  thread_id uuid REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  lang lang_code,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_time ON public.chat_messages(thread_id, created_at);

-- RLS for chat
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "threads: participant read" ON public.chat_threads;
CREATE POLICY "threads: participant read" ON public.chat_threads
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.thread_id = id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "threads: creator insert" ON public.chat_threads;
CREATE POLICY "threads: creator insert" ON public.chat_threads
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "participants: in-thread" ON public.chat_participants;
CREATE POLICY "participants: in-thread" ON public.chat_participants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages: participant" ON public.chat_messages;
CREATE POLICY "messages: participant" ON public.chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid())
  ) WITH CHECK (sender_id = auth.uid());

-- 9. PROFESSIONALS & BOOKINGS
CREATE TABLE IF NOT EXISTS public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  specialties text[],
  calendar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professionals: public read" ON public.professionals;
CREATE POLICY "professionals: public read" ON public.professionals
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_seeker_time ON public.bookings(seeker_user_id, starts_at);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings: seeker" ON public.bookings;
CREATE POLICY "bookings: seeker" ON public.bookings
  FOR ALL USING (seeker_user_id = auth.uid()) WITH CHECK (seeker_user_id = auth.uid());

DROP POLICY IF EXISTS "bookings: professional read" ON public.bookings;
CREATE POLICY "bookings: professional read" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
  );

-- 10. OPPORTUNITIES (JOBS)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text,
  skills text[],
  source_url text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunities: public read" ON public.opportunities;
CREATE POLICY "opportunities: public read" ON public.opportunities
  FOR SELECT USING (true);

-- 11. USER OPPORTUNITY MATCHES
CREATE TABLE IF NOT EXISTS public.user_opportunity_matches (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  match_score numeric(5,2) NOT NULL,
  rationale jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_uom_user_score ON public.user_opportunity_matches(user_id, match_score DESC);

ALTER TABLE public.user_opportunity_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uom: owner read" ON public.user_opportunity_matches;
CREATE POLICY "uom: owner read" ON public.user_opportunity_matches
  FOR SELECT USING (user_id = auth.uid());

-- 12. COMPANY SENTIMENT
CREATE TABLE IF NOT EXISTS public.company_sentiment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  overall_score numeric(4,2) CHECK (overall_score BETWEEN 0 AND 5),
  pros text[],
  cons text[],
  highlights text[],
  sources jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_sentiment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sentiment: public read" ON public.company_sentiment;
CREATE POLICY "sentiment: public read" ON public.company_sentiment
  FOR SELECT USING (true);

-- 13. DEVELOPMENT PLAN
CREATE TABLE IF NOT EXISTS public.devplan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  pillar text NOT NULL CHECK (pillar IN ('computational_power','communication','knowledge','creativity','drive')),
  difficulty text,
  title_i18n_key text NOT NULL,
  description_i18n_key text
);

CREATE TABLE IF NOT EXISTS public.devplan_user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  devplan_item_id uuid NOT NULL REFERENCES public.devplan_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  progress int NOT NULL DEFAULT 0,
  last_result jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.devplan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devplan_user_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devplan_items: public read" ON public.devplan_items;
CREATE POLICY "devplan_items: public read" ON public.devplan_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "devplan_user_items: owner" ON public.devplan_user_items;
CREATE POLICY "devplan_user_items: owner" ON public.devplan_user_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 14. TESTS
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devplan_item_id uuid REFERENCES public.devplan_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  questions jsonb NOT NULL,
  time_limit_seconds int,
  level text
);

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score_pct numeric(5,2),
  detail jsonb
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tests: public read" ON public.tests;
CREATE POLICY "tests: public read" ON public.tests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "test_attempts: owner" ON public.test_attempts;
CREATE POLICY "test_attempts: owner" ON public.test_attempts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 15. CHATBOT EVENTS
CREATE TABLE IF NOT EXISTS public.bot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  route text,
  lang lang_code,
  event_type text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_events: owner read" ON public.bot_events;
CREATE POLICY "bot_events: owner read" ON public.bot_events
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "bot_events: owner insert" ON public.bot_events;
CREATE POLICY "bot_events: owner insert" ON public.bot_events
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 16. FUNCTIONS & TRIGGERS

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at() 
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- Apply to profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- Apply to devplan_user_items
DROP TRIGGER IF EXISTS trg_devplan_user_items_updated_at ON public.devplan_user_items;
CREATE TRIGGER trg_devplan_user_items_updated_at
  BEFORE UPDATE ON public.devplan_user_items 
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- Recompute user scores function
CREATE OR REPLACE FUNCTION public.recompute_user_scores(p_user uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  latest uuid;
  comp numeric; comm numeric; know numeric; crea numeric; drv numeric;
  best ximatar_type;
BEGIN
  -- Get latest completed assessment
  SELECT a.id INTO latest
  FROM public.assessments a
  WHERE a.user_id = p_user AND a.completed_at IS NOT NULL
  ORDER BY a.completed_at DESC
  LIMIT 1;

  -- If no assessments, reset scores
  IF latest IS NULL THEN
    INSERT INTO public.user_scores (user_id, assessments_completed, updated_at)
    VALUES (p_user, 0, now())
    ON CONFLICT (user_id) DO UPDATE SET
      computational_power=0, communication=0, knowledge=0, creativity=0, drive=0,
      assessments_completed = 0,
      match_quality_pct = 0,
      updated_at = now();
    RETURN;
  END IF;

  -- Get pillar scores
  SELECT
    MAX(CASE WHEN pillar='computational_power' THEN score END),
    MAX(CASE WHEN pillar='communication' THEN score END),
    MAX(CASE WHEN pillar='knowledge' THEN score END),
    MAX(CASE WHEN pillar='creativity' THEN score END),
    MAX(CASE WHEN pillar='drive' THEN score END)
  INTO comp, comm, know, crea, drv
  FROM public.assessment_scores 
  WHERE assessment_id = latest;

  -- Update user scores
  INSERT INTO public.user_scores (
    user_id, computational_power, communication, knowledge, creativity, drive,
    assessments_completed, match_quality_pct, updated_at
  )
  VALUES (
    p_user,
    COALESCE(comp, 0),
    COALESCE(comm, 0),
    COALESCE(know, 0),
    COALESCE(crea, 0),
    COALESCE(drv, 0),
    (SELECT COUNT(*) FROM public.assessments WHERE user_id=p_user AND completed_at IS NOT NULL),
    ROUND((COALESCE(comp,0)+COALESCE(comm,0)+COALESCE(know,0)+COALESCE(crea,0)+COALESCE(drv,0))/50*100, 2),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    computational_power = EXCLUDED.computational_power,
    communication = EXCLUDED.communication,
    knowledge = EXCLUDED.knowledge,
    creativity = EXCLUDED.creativity,
    drive = EXCLUDED.drive,
    assessments_completed = EXCLUDED.assessments_completed,
    match_quality_pct = EXCLUDED.match_quality_pct,
    updated_at = now();

  -- Assign XIMAtar based on highest pillar
  best := CASE
    WHEN comp >= GREATEST(comm, know, crea, drv) THEN 'owl'
    WHEN comm >= GREATEST(comp, know, crea, drv) THEN 'parrot'
    WHEN know >= GREATEST(comp, comm, crea, drv) THEN 'elephant'
    WHEN crea >= GREATEST(comp, comm, know, drv) THEN 'fox'
    WHEN drv >= GREATEST(comp, comm, know, crea) THEN 'horse'
    ELSE 'wolf'
  END;

  UPDATE public.profiles SET ximatar = best WHERE id = p_user;
END;
$$;

-- Trigger on assessment completion
CREATE OR REPLACE FUNCTION public.on_assessment_complete() 
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at != NEW.completed_at) THEN
    PERFORM public.recompute_user_scores(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_complete ON public.assessments;
CREATE TRIGGER trg_assessment_complete
  AFTER UPDATE ON public.assessments
  FOR EACH ROW EXECUTE PROCEDURE public.on_assessment_complete();

-- Ensure mentor thread function
CREATE OR REPLACE FUNCTION public.ensure_mentor_thread(p_user uuid, p_mentor uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE 
  t uuid;
BEGIN
  -- Find existing thread
  SELECT ct.id INTO t
  FROM public.chat_threads ct
  JOIN public.chat_participants p1 ON p1.thread_id = ct.id AND p1.user_id = p_user
  JOIN public.chat_participants p2 ON p2.thread_id = ct.id AND p2.user_id = p_mentor
  WHERE ct.is_group = false
  LIMIT 1;

  -- Create if not exists
  IF t IS NULL THEN
    INSERT INTO public.chat_threads(created_by, is_group, topic)
    VALUES (p_user, false, 'mentor') RETURNING id INTO t;
    
    INSERT INTO public.chat_participants(thread_id, user_id) VALUES (t, p_user);
    INSERT INTO public.chat_participants(thread_id, user_id) VALUES (t, p_mentor);
  END IF;
  
  RETURN t;
END;
$$;

-- Log bot event function
CREATE OR REPLACE FUNCTION public.log_bot_event(
  p_user uuid, 
  p_route text, 
  p_lang lang_code, 
  p_type text, 
  p_payload jsonb
)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.bot_events(user_id, route, lang, event_type, payload)
  VALUES (p_user, p_route, p_lang, p_type, p_payload);
$$;

-- Recompute opportunity matches
CREATE OR REPLACE FUNCTION public.recompute_matches(p_user uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.user_opportunity_matches WHERE user_id = p_user;
  
  INSERT INTO public.user_opportunity_matches(user_id, opportunity_id, match_score, rationale)
  SELECT 
    p_user, 
    o.id,
    ROUND((RANDOM()*30 + 70)::numeric, 2),
    jsonb_build_object('algo', 'stub', 'version', '1.0')
  FROM public.opportunities o
  LIMIT 20;
END;
$$;

-- Trigger to recompute matches on score update
CREATE OR REPLACE FUNCTION public.on_user_scores_update() 
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.recompute_matches(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_scores_update ON public.user_scores;
CREATE TRIGGER trg_user_scores_update
  AFTER UPDATE ON public.user_scores
  FOR EACH ROW EXECUTE PROCEDURE public.on_user_scores_update();

-- 17. DASHBOARD VIEW
CREATE OR REPLACE VIEW public.v_dashboard AS
SELECT
  p.id AS user_id,
  p.user_id AS auth_user_id,
  p.name AS full_name,
  p.email,
  p.preferred_lang,
  p.ximatar,
  p.avatar AS avatar_url,
  COALESCE(s.computational_power, 0) AS computational_power,
  COALESCE(s.communication, 0) AS communication,
  COALESCE(s.knowledge, 0) AS knowledge,
  COALESCE(s.creativity, 0) AS creativity,
  COALESCE(s.drive, 0) AS drive,
  COALESCE(s.match_quality_pct, 0) AS match_quality_pct,
  COALESCE(s.assessments_completed, 0) AS assessments_completed,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'opportunity_id', uom.opportunity_id,
          'match_score', uom.match_score,
          'title', o.title,
          'company', o.company
        ) ORDER BY uom.match_score DESC
      )
      FROM public.user_opportunity_matches uom
      LEFT JOIN public.opportunities o ON o.id = uom.opportunity_id
      WHERE uom.user_id = p.id
      LIMIT 10
    ),
    '[]'::jsonb
  ) AS top_matches
FROM public.profiles p
LEFT JOIN public.user_scores s ON s.user_id = p.id;

-- 18. SEED DATA

-- XIMAtar i18n keys
INSERT INTO public.i18n_keys(key) VALUES
  ('ximatar.lion'),('ximatar.owl'),('ximatar.dolphin'),('ximatar.fox'),
  ('ximatar.bear'),('ximatar.cat'),('ximatar.bee'),('ximatar.parrot'),
  ('ximatar.elephant'),('ximatar.wolf'),('ximatar.chameleon'),('ximatar.horse'),
  ('dashboard.title'),('dashboard.your_ximatar'),('dashboard.matched_professional'),
  ('dashboard.book_session'),('dashboard.xima_score'),('dashboard.match_quality'),
  ('dashboard.assessment_completion'),('dashboard.perfect_ximater_title'),
  ('mentor.discover'),('mentor.message'),('mentor.status_connected'),
  ('chat.title'),('chat.welcome_it'),('chat.welcome_en'),('chat.welcome_es')
ON CONFLICT (key) DO NOTHING;

-- Italian translations
INSERT INTO public.i18n_translations(key, lang, text_value) VALUES
  ('dashboard.title', 'it', 'La tua Dashboard XIMA'),
  ('dashboard.your_ximatar', 'it', 'Il tuo XIMAtar'),
  ('mentor.discover', 'it', 'Scopri il tuo mentore'),
  ('chat.welcome_it', 'it', 'Benvenuto su XIMA! Come posso aiutarti?'),
  ('ximatar.lion', 'it', 'Leone'),
  ('ximatar.owl', 'it', 'Gufo'),
  ('ximatar.dolphin', 'it', 'Delfino'),
  ('ximatar.fox', 'it', 'Volpe')
ON CONFLICT (key, lang) DO NOTHING;

-- English translations
INSERT INTO public.i18n_translations(key, lang, text_value) VALUES
  ('dashboard.title', 'en', 'Your XIMA Dashboard'),
  ('dashboard.your_ximatar', 'en', 'Your XIMAtar'),
  ('mentor.discover', 'en', 'Discover your mentor'),
  ('chat.welcome_en', 'en', 'Welcome to XIMA! How can I help you?')
ON CONFLICT (key, lang) DO NOTHING;

-- Spanish translations
INSERT INTO public.i18n_translations(key, lang, text_value) VALUES
  ('dashboard.title', 'es', 'Tu Panel XIMA'),
  ('dashboard.your_ximatar', 'es', 'Tu XIMAtar'),
  ('mentor.discover', 'es', 'Descubre tu mentor'),
  ('chat.welcome_es', 'es', '¡Bienvenido a XIMA! ¿Cómo puedo ayudarte?')
ON CONFLICT (key, lang) DO NOTHING;

-- 19. STORAGE BUCKETS

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create ximatar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ximatar',
  'ximatar',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars: user upload" ON storage.objects;
CREATE POLICY "avatars: user upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars: user update own" ON storage.objects;
CREATE POLICY "avatars: user update own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars: user delete own" ON storage.objects;
CREATE POLICY "avatars: user delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for ximatar (public read only)
DROP POLICY IF EXISTS "ximatar: public read" ON storage.objects;
CREATE POLICY "ximatar: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ximatar');

-- 20. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_assessments_user_completed ON public.assessments(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_assessment ON public.assessment_scores(assessment_id, pillar);
CREATE INDEX IF NOT EXISTS idx_user_scores_updated ON public.user_scores(updated_at);
CREATE INDEX IF NOT EXISTS idx_mentor_matches_mentee ON public.mentor_matches(mentee_user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON public.opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devplan_user_items_user ON public.devplan_user_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON public.test_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_events_user_created ON public.bot_events(user_id, created_at DESC);