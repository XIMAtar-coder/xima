-- Create challenge_followups table for follow-up question loop
CREATE TABLE public.challenge_followups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id uuid NOT NULL REFERENCES public.challenge_invitations(id) ON DELETE CASCADE UNIQUE,
    candidate_profile_id uuid NOT NULL,
    business_id uuid NOT NULL,
    question text NOT NULL,
    answer text,
    asked_at timestamptz DEFAULT now(),
    answered_at timestamptz
);

-- Enable RLS
ALTER TABLE public.challenge_followups ENABLE ROW LEVEL SECURITY;

-- Business can select their own followups
CREATE POLICY "Business users can view their followups"
ON public.challenge_followups
FOR SELECT
USING (auth.uid() = business_id);

-- Candidate can view followups for their invitations
CREATE POLICY "Candidates can view their followups"
ON public.challenge_followups
FOR SELECT
USING (candidate_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Business can insert followups
CREATE POLICY "Business users can create followups"
ON public.challenge_followups
FOR INSERT
WITH CHECK (auth.uid() = business_id);

-- Business can update their own followups (question text)
CREATE POLICY "Business users can update their followups"
ON public.challenge_followups
FOR UPDATE
USING (auth.uid() = business_id);

-- Candidate can update ONLY answer/answered_at for their invitation
CREATE POLICY "Candidates can answer their followups"
ON public.challenge_followups
FOR UPDATE
USING (candidate_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_challenge_followups_invitation ON public.challenge_followups(invitation_id);
CREATE INDEX idx_challenge_followups_candidate ON public.challenge_followups(candidate_profile_id);
CREATE INDEX idx_challenge_followups_business ON public.challenge_followups(business_id);