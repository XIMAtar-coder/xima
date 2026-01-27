-- =======================================================================================
-- SECURITY HARDENING: Update all SECURITY DEFINER functions to use pg_catalog, public
-- Hardened SECURITY DEFINER: fixed search_path + schema-qualified refs (2026-01-27)
-- =======================================================================================

-- 40. get_pending_interests (correct signature: returns TABLE with different columns)
CREATE OR REPLACE FUNCTION public.get_pending_interests()
 RETURNS TABLE(id uuid, business_name text, hiring_goal_title text, interested_at timestamp with time zone, accepted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
  SELECT 
    mi.id,
    bp.company_name as business_name,
    hg.role_title as hiring_goal_title,
    mi.business_interested_at as interested_at,
    mi.candidate_accepted_at IS NOT NULL as accepted
  FROM public.mutual_interest mi
  JOIN public.business_profiles bp ON bp.id = mi.business_id
  LEFT JOIN public.hiring_goal_drafts hg ON hg.id = mi.hiring_goal_id
  WHERE mi.candidate_ximatar_id IN (
    SELECT ximatar_id FROM public.assessment_results WHERE user_id = auth.uid()
  )
  AND mi.business_interested_at IS NOT NULL
  ORDER BY mi.business_interested_at DESC;
$function$;