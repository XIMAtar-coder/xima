-- Link Roberta Fazzeri's mentor record to her auth user
UPDATE public.mentors
SET 
  user_id = '228c76d9-8a89-49ee-ba8e-e517ac8cfb71',
  is_active = true,
  updated_at = NOW()
WHERE id = '928dbd7d-1d4f-4abd-b069-d6bb18fd725e'
  AND (user_id IS NULL OR user_id = '228c76d9-8a89-49ee-ba8e-e517ac8cfb71');