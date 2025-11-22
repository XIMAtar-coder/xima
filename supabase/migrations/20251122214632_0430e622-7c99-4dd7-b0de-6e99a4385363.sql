-- Simplest approach: Create mentor data that works with the edge function
-- The edge function joins mentor_matches to mentors via user_id
-- So we need: profiles.id -> mentor_matches.mentor_user_id = profiles.id
-- And: mentors.user_id -> profiles.user_id

-- Step 1: Get two different profiles to use
WITH profile1 AS (
  SELECT id, user_id FROM profiles ORDER BY created_at DESC OFFSET 0 LIMIT 1
),
profile2 AS (
  SELECT id, user_id FROM profiles ORDER BY created_at DESC OFFSET 1 LIMIT 1
)
-- Step 2: Update mentor to link to profile1's user_id
UPDATE mentors
SET user_id = (SELECT user_id FROM profile1)
WHERE name = 'Dr. Maria Rossi';

-- Step 3: Create mentor match: profile2 is mentee, profile1 is mentor
WITH profile1 AS (
  SELECT id FROM profiles ORDER BY created_at DESC OFFSET 0 LIMIT 1
),
profile2 AS (
  SELECT id FROM profiles ORDER BY created_at DESC OFFSET 1 LIMIT 1
)
INSERT INTO mentor_matches (mentee_user_id, mentor_user_id, reason)
SELECT 
  p2.id,
  p1.id,
  jsonb_build_object('match_reason', 'Auto-assigned for testing')
FROM profile2 p2
CROSS JOIN profile1 p1
WHERE p1.id IS NOT NULL AND p2.id IS NOT NULL
ON CONFLICT DO NOTHING;