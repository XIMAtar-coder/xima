
-- 1. candidate_shortlist.candidate_id references auth.users(id): compare against auth.uid()
DROP POLICY IF EXISTS "Candidates can view their shortlist status" ON public.candidate_shortlist;
CREATE POLICY "Candidates can view their shortlist status"
ON public.candidate_shortlist
FOR SELECT
TO authenticated
USING (candidate_id = (SELECT auth.uid()));

-- 2. is_business_owner: gate the auth.uid() identity branch behind an actual business role
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
        _business_id = (SELECT auth.uid())
        AND public.has_role((SELECT auth.uid()), 'business')
      )
      OR EXISTS (
        SELECT 1 FROM public.business_profiles
        WHERE id = _business_id AND user_id = (SELECT auth.uid())
      );
$function$;

-- 3. business_has_candidate_relationship: unambiguous shortlist join (candidate_id is an auth user id)
CREATE OR REPLACE FUNCTION public.business_has_candidate_relationship(p_business_uid uuid, p_recipient_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_invitations ci
    JOIN public.profiles p ON p.id = ci.candidate_profile_id
    WHERE ci.business_id = p_business_uid AND p.user_id = p_recipient_uid
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_threads ct
    JOIN public.profiles p ON p.id = ct.candidate_profile_id
    WHERE ct.business_id = p_business_uid AND p.user_id = p_recipient_uid
  )
  OR EXISTS (
    SELECT 1 FROM public.candidate_shortlist cs
    WHERE cs.business_id = p_business_uid AND cs.candidate_id = p_recipient_uid
  )
  OR EXISTS (
    SELECT 1 FROM public.hiring_offers ho
    WHERE ho.business_id = p_business_uid AND ho.candidate_user_id = p_recipient_uid
  );
$function$;
