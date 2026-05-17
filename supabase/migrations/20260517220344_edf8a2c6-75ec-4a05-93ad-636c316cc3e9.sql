
-- Fix storage SELECT policy for candidate eligibility docs.
-- Previous policy used storage.foldername(p.name) where p is the profiles row,
-- which has no "name" column, causing candidates to be unable to view their docs.
DROP POLICY IF EXISTS "Candidates can view their own eligibility docs" ON storage.objects;

CREATE POLICY "Candidates can view their own eligibility docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'eligibility_docs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(objects.name))[1] IN (
    SELECT ce.id::text
    FROM public.candidate_eligibility ce
    JOIN public.profiles p ON p.id = ce.candidate_profile_id
    WHERE p.user_id = auth.uid()
  )
);

-- Tighten contact_sales_requests INSERT policy: requester_email must match the
-- authenticated user's email so attackers cannot submit requests as someone else.
DROP POLICY IF EXISTS "Authenticated can insert" ON public.contact_sales_requests;

CREATE POLICY "Authenticated can insert"
ON public.contact_sales_requests
FOR INSERT
TO authenticated
WITH CHECK (
  (
    business_id IS NULL
    OR business_id IN (
      SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = auth.uid()
    )
  )
  AND lower(requester_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
