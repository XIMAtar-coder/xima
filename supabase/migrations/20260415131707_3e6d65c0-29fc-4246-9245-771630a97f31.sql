-- Step 1: Drop old constraint FIRST
ALTER TABLE job_posts DROP CONSTRAINT IF EXISTS job_posts_status_check;

-- Step 2: Migrate existing 'active' rows to 'published'
UPDATE job_posts SET status = 'published' WHERE status = 'active';

-- Step 3: Add new constraint
ALTER TABLE job_posts ADD CONSTRAINT job_posts_status_check
  CHECK (status IN ('draft', 'published', 'paused', 'filled', 'archived'));