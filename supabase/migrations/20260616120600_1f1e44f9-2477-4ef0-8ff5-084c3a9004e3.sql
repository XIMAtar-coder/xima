DROP POLICY IF EXISTS "Business can view eligibility docs for their goals" ON storage.objects;

CREATE POLICY "Business can view eligibility docs for their goals"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'eligibility_docs'
  AND EXISTS (
    SELECT 1
    FROM public.candidate_eligibility ce
    WHERE (ce.id)::text = (storage.foldername(objects.name))[1]
      AND public.is_business_owner(ce.business_id)
  )
);