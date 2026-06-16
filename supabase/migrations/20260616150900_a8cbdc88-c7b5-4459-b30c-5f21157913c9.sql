
-- Fix candidate_challenges policies: candidate_id references profiles.id, not auth.uid()
DROP POLICY IF EXISTS "Candidates can view their own challenges" ON public.candidate_challenges;
DROP POLICY IF EXISTS "Candidates can update their challenge status" ON public.candidate_challenges;

CREATE POLICY "Candidates can view their own challenges"
ON public.candidate_challenges
FOR SELECT
USING (candidate_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Candidates can update their challenge status"
ON public.candidate_challenges
FOR UPDATE
USING (candidate_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Harden is_business_owner: remove direct auth.uid() == _business_id comparison
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = _business_id AND user_id = auth.uid()
  );
$function$;
