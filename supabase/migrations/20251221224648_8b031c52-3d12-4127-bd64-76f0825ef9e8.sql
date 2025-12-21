-- Create table for business review decisions on challenge submissions
CREATE TABLE public.challenge_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.business_challenges(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.challenge_invitations(id) ON DELETE CASCADE,
  candidate_profile_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('shortlist', 'followup', 'pass')),
  followup_question text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (invitation_id)  -- One review per invitation
);

-- Enable RLS
ALTER TABLE public.challenge_reviews ENABLE ROW LEVEL SECURITY;

-- Business can manage their own reviews
CREATE POLICY "Business users can insert their own reviews"
ON public.challenge_reviews
FOR INSERT
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can select their own reviews"
ON public.challenge_reviews
FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Business users can update their own reviews"
ON public.challenge_reviews
FOR UPDATE
USING (auth.uid() = business_id)
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can delete their own reviews"
ON public.challenge_reviews
FOR DELETE
USING (auth.uid() = business_id);

-- Add trigger for updated_at
CREATE TRIGGER update_challenge_reviews_updated_at
  BEFORE UPDATE ON public.challenge_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();