
-- Add new fields to company_profiles for multi-page scanning
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_culture TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS culture_insights JSONB;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS industry_focus TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS pages_scanned JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS open_positions_found JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ;

-- Job post drafts — staging table for discovered positions
CREATE TABLE IF NOT EXISTS job_post_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  role_title TEXT NOT NULL,
  location TEXT,
  department TEXT,
  employment_type TEXT,
  description TEXT,
  source_url TEXT,
  import_source TEXT DEFAULT 'website_scan',
  status TEXT DEFAULT 'draft',
  imported_job_id UUID REFERENCES job_posts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, role_title)
);

ALTER TABLE job_post_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own drafts" ON job_post_drafts FOR SELECT TO authenticated USING (business_id = auth.uid());
CREATE POLICY "Users insert own drafts" ON job_post_drafts FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users update own drafts" ON job_post_drafts FOR UPDATE TO authenticated USING (business_id = auth.uid());
CREATE POLICY "Users delete own drafts" ON job_post_drafts FOR DELETE TO authenticated USING (business_id = auth.uid());
CREATE POLICY "Service role full access drafts" ON job_post_drafts FOR ALL TO service_role USING (true) WITH CHECK (true);
