-- Remove the dangerous public access policy from challenge_invitations
-- The edge function 'verify-challenge-invitation' already uses service role to bypass RLS
-- so this policy is unnecessary and exposes sensitive data

DROP POLICY IF EXISTS "Anyone can verify invitation by token" ON public.challenge_invitations;