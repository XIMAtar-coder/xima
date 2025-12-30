
-- Drop the constraint that blocks multiple L2 invites per goal
ALTER TABLE public.challenge_invitations 
DROP CONSTRAINT IF EXISTS unique_invitation;

-- Add the correct uniqueness rule: only prevent duplicate invites to the SAME challenge
-- This allows multiple L2 invites to different challenges for the same goal
CREATE UNIQUE INDEX unique_invitation_per_challenge 
ON public.challenge_invitations (business_id, candidate_profile_id, challenge_id)
WHERE challenge_id IS NOT NULL;

-- Also need an index to handle Level 1 invitations where challenge_id might be null
-- These should still be unique per goal (one L1 invite per goal)
CREATE UNIQUE INDEX unique_level1_invitation_per_goal
ON public.challenge_invitations (business_id, candidate_profile_id, hiring_goal_id)
WHERE challenge_id IS NULL;
