-- CANONICAL definition of is_business_owner.
-- DO NOT remove the `_business_id = auth.uid()` branch in any future security migration.
-- Convention: across the app, business_id == auth.uid() for the owning user.
-- A user can only claim their own auth.uid(), so this branch is not a privilege escalation.

CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _business_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.business_profiles
        WHERE id = _business_id AND user_id = auth.uid()
      );
$function$;

COMMENT ON FUNCTION public.is_business_owner(uuid) IS
'CANONICAL: returns true if _business_id equals the caller auth.uid() OR the caller owns a business_profiles row with id=_business_id. The auth.uid() branch is REQUIRED by app convention (business_id == auth.uid()) and must NOT be removed by security migrations. ~18 tables depend on it (hiring_goal_drafts, business_challenges, challenge_invitations, challenge_submissions, challenge_reviews, business_shortlists, candidate_shortlist, candidate_eligibility, candidate_challenges, challenge_followups, company_dna_history, hiring_goal_requirements, hiring_offers, job_posts, job_post_drafts, business_job_post_imports, pipeline_chat_threads, shortlist_results).';