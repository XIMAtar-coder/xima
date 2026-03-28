
-- ================================================================
-- Security Fix: RLS overly permissive policies, function search_path, extension schema
-- ================================================================

-- 1. FIX: RLS Policy Always True
-- Drop overly permissive policies that use USING(true) with roles={public}
-- Service role bypasses RLS, so these are unnecessary AND dangerous

-- ai_result_cache: drop public ALL policy, replace with service_role scoped
DROP POLICY IF EXISTS "Service role manages cache" ON public.ai_result_cache;
CREATE POLICY "Service role manages cache" ON public.ai_result_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ai_usage_budget: same fix
DROP POLICY IF EXISTS "Service role manages usage" ON public.ai_usage_budget;
CREATE POLICY "Service role manages budget" ON public.ai_usage_budget
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- intelligence_deposits: same fix
DROP POLICY IF EXISTS "Service role manages deposits" ON public.intelligence_deposits;
CREATE POLICY "Service role manages deposits" ON public.intelligence_deposits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- intelligence_patterns: same fix
DROP POLICY IF EXISTS "Service role manages patterns" ON public.intelligence_patterns;
CREATE POLICY "Service role manages patterns" ON public.intelligence_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_ai_context: same fix
DROP POLICY IF EXISTS "Service role manages context" ON public.user_ai_context;
CREATE POLICY "Service role manages context" ON public.user_ai_context
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. FIX: Function Search Path Mutable
-- Add SET search_path to all 5 functions missing it

CREATE OR REPLACE FUNCTION public.compute_pillar_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  scores jsonb;
BEGIN
  scores := COALESCE(NEW.pillar_scores, '{}'::jsonb);
  
  IF scores != '{}'::jsonb THEN
    NEW.pillar_vector := ARRAY[
      COALESCE((scores->>'drive')::float, 0) / 10.0,
      COALESCE((scores->>'computational_power')::float, (scores->>'comp_power')::float, 0) / 10.0,
      COALESCE((scores->>'communication')::float, 0) / 10.0,
      COALESCE((scores->>'creativity')::float, 0) / 10.0,
      COALESCE((scores->>'knowledge')::float, 0) / 10.0
    ]::vector(5);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_matching_patterns(
  p_pattern_type text,
  p_archetype text DEFAULT NULL,
  p_target_pillar text DEFAULT NULL,
  p_min_confidence double precision DEFAULT 0.7,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(pattern_id uuid, pattern_data jsonb, confidence double precision, source_count integer, usage_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id AS pattern_id,
    ip.pattern_data,
    ip.confidence,
    ip.source_count,
    ip.usage_count
  FROM intelligence_patterns ip
  WHERE ip.pattern_type = p_pattern_type
    AND ip.confidence >= p_min_confidence
    AND (p_archetype IS NULL OR ip.archetype = p_archetype OR ip.archetype IS NULL)
    AND (p_target_pillar IS NULL OR ip.target_pillar = p_target_pillar OR ip.target_pillar IS NULL)
  ORDER BY ip.confidence DESC, ip.usage_count DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_similar_profiles(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(similar_user_id uuid, similarity double precision, archetype text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p2.user_id AS similar_user_id,
    1 - (p1.pillar_vector <=> p2.pillar_vector)::FLOAT AS similarity,
    (p2.ximatar_id)::TEXT AS archetype
  FROM profiles p1
  JOIN profiles p2 ON p2.user_id != p1.user_id AND p2.pillar_vector IS NOT NULL
  WHERE p1.user_id = p_user_id
    AND p1.pillar_vector IS NOT NULL
  ORDER BY p1.pillar_vector <=> p2.pillar_vector ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_jobs_by_vector(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(job_id uuid, role_title text, company_name text, similarity_score double precision, job_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jp.id AS job_id,
    jp.title AS role_title,
    bp.company_name,
    1 - (p.pillar_vector <=> jp.requirement_vector)::FLOAT AS similarity_score,
    jsonb_build_object(
      'description', jp.description,
      'location', jp.location,
      'requirements_must', jp.requirements_must,
      'seniority', jp.seniority,
      'employment_type', jp.employment_type
    ) AS job_data
  FROM profiles p
  JOIN job_posts jp ON jp.requirement_vector IS NOT NULL AND jp.status NOT IN ('draft','archived','closed')
  LEFT JOIN business_profiles bp ON bp.user_id = jp.business_id
  WHERE p.user_id = p_user_id
    AND p.pillar_vector IS NOT NULL
  ORDER BY p.pillar_vector <=> jp.requirement_vector ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_mentors_by_gap(
  p_user_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(mentor_id uuid, mentor_name text, gap_fill_score double precision, mentor_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_vector vector(5);
  ideal_vector vector(5);
BEGIN
  SELECT pillar_vector INTO user_vector FROM profiles WHERE user_id = p_user_id;
  
  IF user_vector IS NULL THEN
    RETURN;
  END IF;
  
  ideal_vector := ARRAY[
    1.0 - user_vector[1],
    1.0 - user_vector[2],
    1.0 - user_vector[3],
    1.0 - user_vector[4],
    1.0 - user_vector[5]
  ]::vector(5);
  
  RETURN QUERY
  SELECT 
    m.id AS mentor_id,
    m.name AS mentor_name,
    1 - (m.strength_vector <=> ideal_vector)::FLOAT AS gap_fill_score,
    jsonb_build_object(
      'specialties', m.specialties,
      'xima_pillars', m.xima_pillars,
      'bio', m.bio,
      'title', m.title
    ) AS mentor_data
  FROM mentors m
  WHERE m.strength_vector IS NOT NULL
    AND m.is_active = true
  ORDER BY m.strength_vector <=> ideal_vector ASC
  LIMIT p_limit;
END;
$$;

-- 3. FIX: Extension in Public Schema
-- Move vector extension from public to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;
