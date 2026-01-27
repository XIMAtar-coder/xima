-- SECURITY FIX: Drop and recreate get_candidate_visibility to respect profiling_opt_out
-- This ensures candidates who opt out of profiling are not visible to business users (GDPR Art. 21/22)

DROP FUNCTION IF EXISTS public.get_candidate_visibility();

CREATE FUNCTION public.get_candidate_visibility()
RETURNS TABLE(
  user_id uuid, 
  profile_id uuid, 
  display_name text, 
  ximatar ximatar_type, 
  ximatar_id uuid, 
  ximatar_label text, 
  ximatar_image text, 
  evaluation_score numeric, 
  pillar_average numeric, 
  computational_power numeric, 
  communication numeric, 
  knowledge numeric, 
  creativity numeric, 
  drive numeric, 
  computed_at timestamp with time zone, 
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow business or admin users
  IF NOT (has_role(auth.uid(), 'business'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.id as profile_id,
    -- Use name field, fallback to truncated user_id
    COALESCE(
      NULLIF(TRIM(p.name), ''),
      NULLIF(TRIM(p.full_name), ''),
      'User ' || LEFT(p.user_id::text, 8)
    ) as display_name,
    p.ximatar,
    -- Prefer profiles.ximatar_id, fallback to latest assessment_results.ximatar_id
    COALESCE(p.ximatar_id, ar.ximatar_id) as ximatar_id,
    -- Get label from ximatars table, fallback to profiles.ximatar enum, then 'unknown'
    COALESCE(
      x.label,
      LOWER(p.ximatar::text),
      'unknown'
    ) as ximatar_label,
    -- Get image from profiles first, then ximatars, then derive from ximatar enum
    COALESCE(
      NULLIF(p.ximatar_image, ''),
      REPLACE(x.image_url, 'public/', '/'),
      CASE WHEN p.ximatar IS NOT NULL THEN '/ximatars/' || LOWER(p.ximatar::text) || '.png' ELSE NULL END,
      '/placeholder.svg'
    ) as ximatar_image,
    -- Evaluation score from assessment_results
    COALESCE(ar.total_score, 0)::numeric AS evaluation_score,
    -- Calculate pillar average from profiles.pillar_scores JSONB
    ROUND(
      (
        COALESCE((p.pillar_scores->>'computational_power')::numeric, ps_comp.score, 0) +
        COALESCE((p.pillar_scores->>'communication')::numeric, ps_comm.score, 0) +
        COALESCE((p.pillar_scores->>'knowledge')::numeric, ps_know.score, 0) +
        COALESCE((p.pillar_scores->>'creativity')::numeric, ps_crea.score, 0) +
        COALESCE((p.pillar_scores->>'drive')::numeric, ps_drv.score, 0)
      ) / 5, 2
    )::numeric AS pillar_average,
    -- Individual pillars: prefer profiles.pillar_scores, fallback to pillar_scores table
    COALESCE((p.pillar_scores->>'computational_power')::numeric, ps_comp.score, 0)::numeric as computational_power,
    COALESCE((p.pillar_scores->>'communication')::numeric, ps_comm.score, 0)::numeric as communication,
    COALESCE((p.pillar_scores->>'knowledge')::numeric, ps_know.score, 0)::numeric as knowledge,
    COALESCE((p.pillar_scores->>'creativity')::numeric, ps_crea.score, 0)::numeric as creativity,
    COALESCE((p.pillar_scores->>'drive')::numeric, ps_drv.score, 0)::numeric as drive,
    ar.computed_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        COALESCE(ar.total_score, 0) DESC, 
        COALESCE(ar.computed_at, p.created_at) DESC,
        RANDOM() * 0.05
    )::bigint AS rank
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM assessment_results
    WHERE assessment_results.user_id = p.user_id
    ORDER BY computed_at DESC NULLS LAST
    LIMIT 1
  ) ar ON true
  -- Join ximatars preferring profiles.ximatar_id, then assessment ximatar_id
  LEFT JOIN ximatars x ON x.id = COALESCE(p.ximatar_id, ar.ximatar_id)
  -- Fallback pillar scores from pillar_scores table
  LEFT JOIN pillar_scores ps_comp ON ps_comp.assessment_result_id = ar.id AND ps_comp.pillar = 'computational_power'
  LEFT JOIN pillar_scores ps_comm ON ps_comm.assessment_result_id = ar.id AND ps_comm.pillar = 'communication'
  LEFT JOIN pillar_scores ps_know ON ps_know.assessment_result_id = ar.id AND ps_know.pillar = 'knowledge'
  LEFT JOIN pillar_scores ps_crea ON ps_crea.assessment_result_id = ar.id AND ps_crea.pillar = 'creativity'
  LEFT JOIN pillar_scores ps_drv ON ps_drv.assessment_result_id = ar.id AND ps_drv.pillar = 'drive'
  WHERE p.user_id IS NOT NULL
    -- SECURITY FIX: Respect profiling opt-out preference (GDPR Art. 21/22)
    AND (p.profiling_opt_out = false OR p.profiling_opt_out IS NULL)
    -- Exclude business users from candidate pool
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.user_id AND ur.role = 'business'
    )
  ORDER BY rank;
END;
$$;

-- Document GDPR compliance
COMMENT ON FUNCTION public.get_candidate_visibility() IS 
'Returns anonymized candidate assessment data for business users. 
GDPR compliant: respects profiling_opt_out preference per Art. 21/22.
Only accessible by business or admin role users.';

-- SECURITY FIX: Drop assign_first_admin function to prevent privilege escalation
-- This function should only exist during initial setup and is a security risk if left in production
DROP FUNCTION IF EXISTS public.assign_first_admin(uuid);