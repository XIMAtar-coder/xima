-- Fix: Use profiles.id (not user_id) for mentor_matches
-- First, get the current logged-in user's profile
WITH mentor_profile AS (
  -- Use an existing profile as the mentor (we'll assign Maria Rossi to this profile)
  SELECT id, user_id FROM profiles 
  WHERE full_name IS NOT NULL 
  ORDER BY created_at DESC 
  LIMIT 1
),
update_mentor AS (
  -- Link Maria Rossi mentor record to this profile
  UPDATE mentors m
  SET user_id = (SELECT user_id FROM mentor_profile)
  WHERE m.name = 'Dr. Maria Rossi'
  RETURNING id
),
users_needing_mentors AS (
  -- Get profiles that need mentors
  SELECT p.id as profile_id
  FROM profiles p
  WHERE p.ximatar IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM mentor_matches mm WHERE mm.mentee_user_id = p.id
  )
  LIMIT 5
)
-- Create mentor matches using profiles.id
INSERT INTO mentor_matches (mentee_user_id, mentor_user_id, reason)
SELECT 
  unm.profile_id,
  mp.id,
  jsonb_build_object(
    'match_reason', 'Career development and leadership focus',
    'auto_assigned', true
  )
FROM users_needing_mentors unm
CROSS JOIN mentor_profile mp
ON CONFLICT DO NOTHING;