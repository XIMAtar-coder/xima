-- Add structured snapshot fields to business_profiles table
-- These fields store auto-extracted + manual override data for the Company Snapshot banner

-- Auto-extracted fields (populated by generate-company-profile)
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS snapshot_hq_city text,
ADD COLUMN IF NOT EXISTS snapshot_hq_country text,
ADD COLUMN IF NOT EXISTS snapshot_industry text,
ADD COLUMN IF NOT EXISTS snapshot_employees_count integer,
ADD COLUMN IF NOT EXISTS snapshot_revenue_range text,
ADD COLUMN IF NOT EXISTS snapshot_founded_year integer,
ADD COLUMN IF NOT EXISTS snapshot_last_enriched_at timestamptz;

-- Manual override fields (business user can edit in Settings)
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS manual_hq_city text,
ADD COLUMN IF NOT EXISTS manual_hq_country text,
ADD COLUMN IF NOT EXISTS manual_industry text,
ADD COLUMN IF NOT EXISTS manual_employees_count integer,
ADD COLUMN IF NOT EXISTS manual_revenue_range text,
ADD COLUMN IF NOT EXISTS manual_founded_year integer,
ADD COLUMN IF NOT EXISTS manual_website text,
ADD COLUMN IF NOT EXISTS snapshot_manual_override boolean DEFAULT false;