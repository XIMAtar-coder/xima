-- Update get_candidate_visibility to normalize XIMAtar image URLs
-- This ensures all image paths are consistently formatted (removing 'public/' prefix)
CREATE OR REPLACE FUNCTION public.get_candidate_visibility()
RETURNS TABLE(
  user_id UUID,
  ximatar ximatar_type,
  ximatar_id UUID,
  ximatar_label TEXT,
  ximatar_image TEXT,
  evaluation_score NUMERIC,
  pillar_average NUMERIC,
  computational_power NUMERIC,
  communication NUMERIC,
  knowledge NUMERIC,
  creativity NUMERIC,
  drive NUMERIC,
  computed_at TIMESTAMP WITH TIME ZONE,
  rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.ximatar,
    ar.ximatar_id,
    COALESCE(x.label, LOWER(p.ximatar::text)) as ximatar_label,
    COALESCE(REPLACE(x.image_url, 'public/', '/'), '/ximatars/fox.png') as ximatar_image,
    COALESCE(ar.total_score, 0) AS evaluation_score,
    ROUND((
      COALESCE(ps_comp.score, 0) + 
      COALESCE(ps_comm.score, 0) + 
      COALESCE(ps_know.score, 0) + 
      COALESCE(ps_crea.score, 0) + 
      COALESCE(ps_drv.score, 0)
    ) / 5, 2) AS pillar_average,
    COALESCE(ps_comp.score, 0) as computational_power,
    COALESCE(ps_comm.score, 0) as communication,
    COALESCE(ps_know.score, 0) as knowledge,
    COALESCE(ps_crea.score, 0) as creativity,
    COALESCE(ps_drv.score, 0) as drive,
    ar.computed_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        COALESCE(ar.total_score, 0) DESC, 
        COALESCE(ar.computed_at, p.created_at) DESC,
        RANDOM() * 0.05
    ) AS rank
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM assessment_results
    WHERE user_id = p.user_id
    ORDER BY computed_at DESC NULLS LAST
    LIMIT 1
  ) ar ON true
  LEFT JOIN ximatars x ON x.id = ar.ximatar_id
  LEFT JOIN pillar_scores ps_comp ON ps_comp.assessment_result_id = ar.id AND ps_comp.pillar = 'computational_power'
  LEFT JOIN pillar_scores ps_comm ON ps_comm.assessment_result_id = ar.id AND ps_comm.pillar = 'communication'
  LEFT JOIN pillar_scores ps_know ON ps_know.assessment_result_id = ar.id AND ps_know.pillar = 'knowledge'
  LEFT JOIN pillar_scores ps_crea ON ps_crea.assessment_result_id = ar.id AND ps_crea.pillar = 'creativity'
  LEFT JOIN pillar_scores ps_drv ON ps_drv.assessment_result_id = ar.id AND ps_drv.pillar = 'drive'
  WHERE p.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.user_id AND ur.role = 'business'
    )
    AND (
      has_role(auth.uid(), 'business'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role)
    )
  ORDER BY rank;
$$;