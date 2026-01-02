-- Remove the overly permissive public SELECT policy that exposes all challenge invitation data
-- The verify-challenge-invitation edge function already handles secure token verification
-- using service role with rate limiting and minimal data exposure

DROP POLICY IF EXISTS "Anyone can verify invitation by token" ON public.challenge_invitations;