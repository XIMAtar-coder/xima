
-- ============================================================
-- PHASE 1 MIGRATION: Business Flow Upgrade v2
-- ============================================================

-- 1. HIRING GOAL LIFECYCLE: drop old constraints first
ALTER TABLE hiring_goal_drafts DROP CONSTRAINT IF EXISTS hiring_goal_drafts_status_check;
ALTER TABLE hiring_goal_drafts DROP CONSTRAINT IF EXISTS hiring_goal_completed_fields_check;

-- 2. Migrate data BEFORE adding new constraints
UPDATE hiring_goal_drafts SET status = 'active' WHERE status = 'completed';

-- 3. Now add new constraints (all rows are compliant)
ALTER TABLE hiring_goal_drafts ADD CONSTRAINT hiring_goal_drafts_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'filled', 'closed'));

ALTER TABLE hiring_goal_drafts ADD CONSTRAINT hiring_goal_active_fields_check
  CHECK ((status <> 'active') OR (
    task_description IS NOT NULL AND task_description <> '' AND
    experience_level IS NOT NULL AND work_model IS NOT NULL AND
    country IS NOT NULL AND country <> '' AND
    salary_min IS NOT NULL AND salary_max IS NOT NULL AND
    salary_min <= salary_max AND salary_currency IS NOT NULL AND
    salary_period IS NOT NULL
  ));

-- 4. New columns for import linking and XIMA HR
ALTER TABLE hiring_goal_drafts
  ADD COLUMN IF NOT EXISTS imported_from_listing_id uuid REFERENCES job_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_suggested_ximatar text,
  ADD COLUMN IF NOT EXISTS xima_hr_requested boolean DEFAULT false;

-- 5. BUSINESS CHALLENGES: TEMPLATE FLAG
ALTER TABLE business_challenges
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- 6. JOB POSTS EXTENSION
ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS xima_hr_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS xima_hr_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS xima_hr_status text,
  ADD COLUMN IF NOT EXISTS linked_hiring_goal_id uuid REFERENCES hiring_goal_drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_suggested_ximatar text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS filled_at timestamptz;

ALTER TABLE job_posts DROP CONSTRAINT IF EXISTS job_posts_xima_hr_status_check;
ALTER TABLE job_posts ADD CONSTRAINT job_posts_xima_hr_status_check
  CHECK (xima_hr_status IS NULL OR xima_hr_status IN ('pending','in_progress','completed','declined'));

-- 7. BUSINESS USAGE COUNTERS
CREATE TABLE IF NOT EXISTS public.business_usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  challenge_templates_created integer DEFAULT 0,
  pool_detail_views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, week_start)
);

ALTER TABLE business_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business reads own counters" ON business_usage_counters
  FOR SELECT USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Business inserts own counters" ON business_usage_counters
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Business updates own counters" ON business_usage_counters
  FOR UPDATE USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- 8. ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text DEFAULT 'info',
  payload jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'unread',
  created_at timestamptz DEFAULT now(),
  actioned_at timestamptz,
  actioned_by uuid REFERENCES auth.users(id)
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 9. SAVED CANDIDATES
CREATE TABLE IF NOT EXISTS public.saved_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL,
  saved_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  saved_under_plan text,
  UNIQUE(business_id, candidate_user_id)
);

ALTER TABLE saved_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business manages own saved candidates" ON saved_candidates
  FOR ALL USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));
