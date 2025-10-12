-- ============================================
-- FIX SECURITY ISSUES FROM XIMA MIGRATION
-- ============================================

-- 1. FIX FUNCTIONS - Add search_path to all functions
CREATE OR REPLACE FUNCTION public.touch_updated_at() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.recompute_user_scores(p_user uuid)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest uuid;
  comp numeric; comm numeric; know numeric; crea numeric; drv numeric;
  best ximatar_type;
BEGIN
  SELECT a.id INTO latest
  FROM public.assessments a
  WHERE a.user_id = p_user AND a.completed_at IS NOT NULL
  ORDER BY a.completed_at DESC
  LIMIT 1;

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

  SELECT
    MAX(CASE WHEN pillar='computational_power' THEN score END),
    MAX(CASE WHEN pillar='communication' THEN score END),
    MAX(CASE WHEN pillar='knowledge' THEN score END),
    MAX(CASE WHEN pillar='creativity' THEN score END),
    MAX(CASE WHEN pillar='drive' THEN score END)
  INTO comp, comm, know, crea, drv
  FROM public.assessment_scores 
  WHERE assessment_id = latest;

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

CREATE OR REPLACE FUNCTION public.on_assessment_complete() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at != NEW.completed_at) THEN
    PERFORM public.recompute_user_scores(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_mentor_thread(p_user uuid, p_mentor uuid)
RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  t uuid;
BEGIN
  SELECT ct.id INTO t
  FROM public.chat_threads ct
  JOIN public.chat_participants p1 ON p1.thread_id = ct.id AND p1.user_id = p_user
  JOIN public.chat_participants p2 ON p2.thread_id = ct.id AND p2.user_id = p_mentor
  WHERE ct.is_group = false
  LIMIT 1;

  IF t IS NULL THEN
    INSERT INTO public.chat_threads(created_by, is_group, topic)
    VALUES (p_user, false, 'mentor') RETURNING id INTO t;
    
    INSERT INTO public.chat_participants(thread_id, user_id) VALUES (t, p_user);
    INSERT INTO public.chat_participants(thread_id, user_id) VALUES (t, p_mentor);
  END IF;
  
  RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_bot_event(
  p_user uuid, 
  p_route text, 
  p_lang lang_code, 
  p_type text, 
  p_payload jsonb
)
RETURNS void 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.bot_events(user_id, route, lang, event_type, payload)
  VALUES (p_user, p_route, p_lang, p_type, p_payload);
$$;

CREATE OR REPLACE FUNCTION public.recompute_matches(p_user uuid)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.on_user_scores_update() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_matches(NEW.user_id);
  RETURN NEW;
END;
$$;

-- 2. FIX I18N TABLES - Enable RLS
ALTER TABLE public.i18n_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.i18n_translations ENABLE ROW LEVEL SECURITY;

-- Public read for i18n
DROP POLICY IF EXISTS "i18n_keys: public read" ON public.i18n_keys;
CREATE POLICY "i18n_keys: public read" ON public.i18n_keys
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "i18n_translations: public read" ON public.i18n_translations;
CREATE POLICY "i18n_translations: public read" ON public.i18n_translations
  FOR SELECT USING (true);

-- 3. RECREATE DASHBOARD VIEW WITHOUT SECURITY DEFINER
-- Drop the old view and recreate without security definer
DROP VIEW IF EXISTS public.v_dashboard;

CREATE VIEW public.v_dashboard 
WITH (security_invoker = true)
AS
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