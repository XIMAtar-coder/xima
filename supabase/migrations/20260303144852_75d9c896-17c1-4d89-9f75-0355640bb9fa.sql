
-- Fix weak upload path validation on eligibility_docs storage bucket
-- Restrict uploads to folders matching the user's own eligibility records

DROP POLICY IF EXISTS "Candidates can upload eligibility docs" ON storage.objects;

CREATE POLICY "Candidates can upload eligibility docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'eligibility_docs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT ce.id::text
    FROM public.candidate_eligibility ce
    INNER JOIN public.profiles p ON ce.candidate_profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
