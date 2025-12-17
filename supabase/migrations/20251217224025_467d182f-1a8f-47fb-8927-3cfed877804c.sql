-- Create challenge_submissions table for storing candidate responses
CREATE TABLE public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.challenge_invitations(id) ON DELETE CASCADE,
  candidate_profile_id uuid NOT NULL,
  business_id uuid NOT NULL,
  hiring_goal_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.business_challenges(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  draft_payload jsonb DEFAULT '{}'::jsonb,
  submitted_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE(invitation_id)
);

-- Enable RLS
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Candidates can read/write their own submissions
CREATE POLICY "Candidates can view their own submissions"
ON public.challenge_submissions
FOR SELECT
USING (
  candidate_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can insert their own submissions"
ON public.challenge_submissions
FOR INSERT
WITH CHECK (
  candidate_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can update their own draft submissions"
ON public.challenge_submissions
FOR UPDATE
USING (
  candidate_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  AND status = 'draft'
);

-- Business users can view submissions for their challenges
CREATE POLICY "Business users can view their submissions"
ON public.challenge_submissions
FOR SELECT
USING (business_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_challenge_submissions_updated_at
BEFORE UPDATE ON public.challenge_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();