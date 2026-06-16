
DROP POLICY IF EXISTS "Business users can view their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can insert their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can update their own company profile" ON public.company_profiles;

CREATE POLICY "Business users can view their own company profile"
  ON public.company_profiles FOR SELECT
  TO authenticated
  USING (company_id = auth.uid() OR public.is_business_owner(company_id));

CREATE POLICY "Business users can insert their own company profile"
  ON public.company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid() OR public.is_business_owner(company_id));

CREATE POLICY "Business users can update their own company profile"
  ON public.company_profiles FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid() OR public.is_business_owner(company_id))
  WITH CHECK (company_id = auth.uid() OR public.is_business_owner(company_id));
