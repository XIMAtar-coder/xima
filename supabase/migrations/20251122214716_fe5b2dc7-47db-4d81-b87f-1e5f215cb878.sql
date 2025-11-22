-- Complete workflow in proper CTE structure
WITH current_user_profile AS (
  SELECT id, user_id FROM profiles WHERE user_id = '116436f8-378b-43fc-a7ae-a59c99fc19d9' LIMIT 1
),
other_profile AS (
  SELECT id, user_id FROM profiles WHERE user_id != '116436f8-378b-43fc-a7ae-a59c99fc19d9' ORDER BY created_at DESC LIMIT 1
),
delete_old AS (
  DELETE FROM mentor_matches 
  WHERE mentee_user_id = (SELECT id FROM current_user_profile)
  RETURNING id
),
update_mentor AS (
  UPDATE mentors
  SET user_id = (SELECT user_id FROM other_profile)
  WHERE name = 'Dr. Maria Rossi'
  RETURNING id
)
-- Create new match: current user is mentee, other profile is mentor
INSERT INTO mentor_matches (mentee_user_id, mentor_user_id, reason)
SELECT 
  cup.id,
  op.id,
  jsonb_build_object('match_reason', 'Career development and leadership focus', 'mentor', 'Dr. Maria Rossi')
FROM current_user_profile cup
CROSS JOIN other_profile op
ON CONFLICT DO NOTHING;