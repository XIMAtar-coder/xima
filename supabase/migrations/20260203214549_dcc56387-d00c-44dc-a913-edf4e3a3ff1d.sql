-- STEP 1: Ensure the 3 valid mentors are active and properly configured
-- Daniel Cracau (already linked: user_id = 3cdecd6c-8d97-4d7f-bbfd-ed08b6cc4a17)
UPDATE public.mentors
SET is_active = true, updated_at = NOW()
WHERE id = '82eb1e7a-efb1-4170-931b-712db6e33ba8';

-- Pietro Cozzi (already linked: user_id = d1fe1ffd-f1a1-4ee4-a4d5-679e7f60e182)
UPDATE public.mentors
SET is_active = true, updated_at = NOW()
WHERE id = '8f879039-36cb-4367-8064-49ba9a9fdbf2';

-- Roberta Fazzeri (needs to stay active, user_id will be linked when auth user is created)
UPDATE public.mentors
SET is_active = true, updated_at = NOW()
WHERE id = '928dbd7d-1d4f-4abd-b069-d6bb18fd725e';

-- STEP 2: Safe deactivation of ALL other mentors
-- This ensures they don't appear in user-facing flows but preserves historical data
UPDATE public.mentors
SET is_active = false, updated_at = NOW()
WHERE id NOT IN (
  '82eb1e7a-efb1-4170-931b-712db6e33ba8', -- Daniel Cracau
  '8f879039-36cb-4367-8064-49ba9a9fdbf2', -- Pietro Cozzi
  '928dbd7d-1d4f-4abd-b069-d6bb18fd725e'  -- Roberta Fazzeri
);

-- STEP 3: Verify the mentors_public view returns exactly 3 rows
-- (This is a read-only check embedded as a comment for documentation)
-- SELECT COUNT(*) FROM mentors_public; -- Should return 3