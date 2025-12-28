-- Add RLS policy to allow invited candidates to view challenge details
CREATE POLICY "Invited candidates can view challenge details"
ON public.business_challenges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.challenge_invitations ci
    JOIN public.profiles p ON p.id = ci.candidate_profile_id
    WHERE ci.challenge_id = business_challenges.id
      AND p.user_id = auth.uid()
  )
  OR is_public = true
);