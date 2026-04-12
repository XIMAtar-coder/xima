-- Add human-edit override columns to company_profiles
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS summary_override TEXT;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS values_override JSONB;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS operating_style_override TEXT;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS communication_style_override TEXT;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS ideal_traits_override JSONB;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS overrides_updated_at TIMESTAMPTZ;