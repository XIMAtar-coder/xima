ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS website_scan_status text
  DEFAULT 'ok';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_profiles_website_scan_status_check'
  ) THEN
    ALTER TABLE public.company_profiles
      ADD CONSTRAINT company_profiles_website_scan_status_check
      CHECK (website_scan_status IN ('ok','insufficient','failed'));
  END IF;
END $$;