-- Enable RLS on company_profiles and allow service role to insert/update
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Edge function can insert company profiles" ON public.company_profiles;
CREATE POLICY "Edge function can insert company profiles"
ON public.company_profiles
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Edge function can update company profiles" ON public.company_profiles;
CREATE POLICY "Edge function can update company profiles"
ON public.company_profiles
FOR UPDATE
TO service_role
USING (true);