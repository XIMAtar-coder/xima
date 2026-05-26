CREATE POLICY "Candidates can delete own challenge videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'challenge-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can delete challenge videos"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'challenge-videos');