
ALTER TABLE hiring_goal_drafts ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;
ALTER TABLE hiring_goal_drafts ADD COLUMN IF NOT EXISTS filled_by UUID;
ALTER TABLE hiring_goal_drafts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE hiring_goal_drafts ADD COLUMN IF NOT EXISTS closed_reason TEXT;
