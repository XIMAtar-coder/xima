-- Create challenge_invitations table for tracking invite to challenge workflow
CREATE TABLE public.challenge_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  hiring_goal_id uuid NOT NULL REFERENCES public.hiring_goal_drafts(id) ON DELETE CASCADE,
  candidate_profile_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'expired')),
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_via text[] NOT NULL DEFAULT ARRAY['in_app'],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  CONSTRAINT unique_invitation UNIQUE (business_id, hiring_goal_id, candidate_profile_id)
);

-- Create index for fast token lookups
CREATE INDEX idx_challenge_invitations_token ON public.challenge_invitations(invite_token);
CREATE INDEX idx_challenge_invitations_candidate ON public.challenge_invitations(candidate_profile_id, status);
CREATE INDEX idx_challenge_invitations_business ON public.challenge_invitations(business_id);

-- Enable RLS
ALTER TABLE public.challenge_invitations ENABLE ROW LEVEL SECURITY;

-- Business users can insert new invitations
CREATE POLICY "Business users can create invitations"
ON public.challenge_invitations
FOR INSERT
WITH CHECK (auth.uid() = business_id);

-- Business users can view their own invitations
CREATE POLICY "Business users can view their invitations"
ON public.challenge_invitations
FOR SELECT
USING (auth.uid() = business_id);

-- Business users can update their own invitations
CREATE POLICY "Business users can update their invitations"
ON public.challenge_invitations
FOR UPDATE
USING (auth.uid() = business_id);

-- Candidates can view invitations sent to them
CREATE POLICY "Candidates can view their invitations"
ON public.challenge_invitations
FOR SELECT
USING (candidate_profile_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Candidates can update status of their invitations (accept/decline)
CREATE POLICY "Candidates can respond to invitations"
ON public.challenge_invitations
FOR UPDATE
USING (candidate_profile_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
))
WITH CHECK (candidate_profile_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Public policy for token-based lookup (for magic link access)
CREATE POLICY "Anyone can verify invitation by token"
ON public.challenge_invitations
FOR SELECT
USING (true);

-- Create function to get pending invitations for a candidate
CREATE OR REPLACE FUNCTION public.get_candidate_invitations(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  hiring_goal_id uuid,
  status text,
  invite_token uuid,
  created_at timestamp with time zone,
  company_name text,
  role_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.business_id,
    ci.hiring_goal_id,
    ci.status,
    ci.invite_token,
    ci.created_at,
    COALESCE(bp.company_name, 'Company') as company_name,
    hg.role_title
  FROM challenge_invitations ci
  JOIN profiles p ON p.id = ci.candidate_profile_id
  LEFT JOIN business_profiles bp ON bp.user_id = ci.business_id
  LEFT JOIN hiring_goal_drafts hg ON hg.id = ci.hiring_goal_id
  WHERE p.user_id = p_user_id
  ORDER BY ci.created_at DESC;
END;
$$;