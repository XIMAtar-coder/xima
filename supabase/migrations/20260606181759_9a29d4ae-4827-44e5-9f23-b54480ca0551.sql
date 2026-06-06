
CREATE POLICY "Candidates can update own challenge videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'challenge-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'challenge-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Service role can update challenge videos"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'challenge-videos')
WITH CHECK (bucket_id = 'challenge-videos');
