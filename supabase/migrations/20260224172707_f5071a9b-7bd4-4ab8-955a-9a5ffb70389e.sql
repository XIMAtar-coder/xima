
-- Fix: restrict contact_sales_requests insert to only the submitter's business
DROP POLICY IF EXISTS "Authenticated can insert own" ON public.contact_sales_requests;
CREATE POLICY "Authenticated can insert" ON public.contact_sales_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IS NULL 
    OR business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid())
  );
