-- Fix mentor assignment using correct profile IDs
INSERT INTO mentor_matches (mentee_user_id, mentor_user_id, reason)
VALUES (
  '429c6647-8393-49c6-b33e-ce5f65b010a4',
  '7e1ee5aa-c0fd-488f-9c72-829161890552',
  jsonb_build_object(
    'type', 'manual_assignment',
    'reason', 'Career development and technical skills mentoring'
  )
)
ON CONFLICT DO NOTHING;