-- Drop the old foreign key constraint on mentor_matches.mentor_user_id
ALTER TABLE mentor_matches 
DROP CONSTRAINT IF EXISTS mentor_matches_mentor_user_id_fkey;

-- Add new foreign key to allow mentor_user_id to reference either profiles OR professionals
-- We'll use profiles as the main reference but won't enforce it strictly
-- Instead, we'll just ensure the column exists
ALTER TABLE mentor_matches 
ADD CONSTRAINT mentor_matches_mentor_valid 
CHECK (mentor_user_id IS NOT NULL);

COMMENT ON COLUMN mentor_matches.mentor_user_id IS 'References either profiles.id (for user mentors) or professionals.id (for professional mentors)';