DROP POLICY IF EXISTS "Business can view standing videos for their challenges" ON storage.objects;
CREATE POLICY "Business can view standing videos for their challenges"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'challenge-videos'
  AND (storage.foldername(name))[1] = 'standing'
  AND EXISTS (
    SELECT 1 FROM public.challenge_submissions cs
    WHERE (cs.candidate_profile_id)::text = (storage.foldername(objects.name))[2]
      AND (cs.invitation_id)::text = replace(storage.filename(objects.name), '.webm', '')
      AND public.is_business_owner(cs.business_id)
  )
);