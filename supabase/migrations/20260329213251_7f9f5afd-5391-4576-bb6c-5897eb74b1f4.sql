-- Add new columns to business_profiles
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS hiring_approach TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS team_culture TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS growth_stage TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create SECURITY DEFINER function for business registration
CREATE OR REPLACE FUNCTION public.register_business_account(
  p_user_id UUID,
  p_company_name TEXT,
  p_website_url TEXT DEFAULT NULL,
  p_recruiter_email TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_company_size TEXT DEFAULT NULL,
  p_headquarters_country TEXT DEFAULT NULL,
  p_headquarters_city TEXT DEFAULT NULL,
  p_hiring_approach TEXT DEFAULT NULL,
  p_team_culture TEXT DEFAULT NULL,
  p_growth_stage TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign business role (elevated privileges bypass RLS)
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'business')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create or update business profile
  INSERT INTO business_profiles (
    user_id, company_name, website, manual_industry, company_size,
    manual_hq_country, manual_hq_city, hiring_approach, team_culture,
    growth_stage, hr_contact_email, created_at, updated_at
  ) VALUES (
    p_user_id, p_company_name, p_website_url, p_industry, p_company_size,
    p_headquarters_country, p_headquarters_city, p_hiring_approach, p_team_culture,
    p_growth_stage, p_recruiter_email, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    website = COALESCE(EXCLUDED.website, business_profiles.website),
    manual_industry = COALESCE(EXCLUDED.manual_industry, business_profiles.manual_industry),
    company_size = COALESCE(EXCLUDED.company_size, business_profiles.company_size),
    manual_hq_country = COALESCE(EXCLUDED.manual_hq_country, business_profiles.manual_hq_country),
    manual_hq_city = COALESCE(EXCLUDED.manual_hq_city, business_profiles.manual_hq_city),
    hiring_approach = COALESCE(EXCLUDED.hiring_approach, business_profiles.hiring_approach),
    team_culture = COALESCE(EXCLUDED.team_culture, business_profiles.team_culture),
    growth_stage = COALESCE(EXCLUDED.growth_stage, business_profiles.growth_stage),
    hr_contact_email = COALESCE(EXCLUDED.hr_contact_email, business_profiles.hr_contact_email),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'company_name', p_company_name);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.register_business_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_business_account TO anon;

-- Fix RLS on user_roles: allow users to read own roles
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT USING (user_id = auth.uid());