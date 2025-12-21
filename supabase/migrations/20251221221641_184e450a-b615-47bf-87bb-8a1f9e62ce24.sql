-- Drop existing candidate policies on challenge_submissions
DROP POLICY IF EXISTS "Candidates can insert their own submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Candidates can update their own draft submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Candidates can view their own submissions" ON public.challenge_submissions;

-- Create invitation-driven INSERT policy for candidates
-- Allows insert only when the invitation_id belongs to the candidate's profile
CREATE POLICY "Candidates can insert via their invitation"
ON public.challenge_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.challenge_invitations i
    JOIN public.profiles p ON p.id = i.candidate_profile_id
    WHERE i.id = challenge_submissions.invitation_id
      AND p.user_id = auth.uid()
  )
);

-- Create invitation-driven UPDATE policy for candidates (draft + final submit)
-- No status='draft' restriction so they can submit the final version
CREATE POLICY "Candidates can update via their invitation"
ON public.challenge_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.challenge_invitations i
    JOIN public.profiles p ON p.id = i.candidate_profile_id
    WHERE i.id = challenge_submissions.invitation_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.challenge_invitations i
    JOIN public.profiles p ON p.id = i.candidate_profile_id
    WHERE i.id = challenge_submissions.invitation_id
      AND p.user_id = auth.uid()
  )
);

-- Create invitation-driven SELECT policy for candidates
CREATE POLICY "Candidates can view via their invitation"
ON public.challenge_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.challenge_invitations i
    JOIN public.profiles p ON p.id = i.candidate_profile_id
    WHERE i.id = challenge_submissions.invitation_id
      AND p.user_id = auth.uid()
  )
);