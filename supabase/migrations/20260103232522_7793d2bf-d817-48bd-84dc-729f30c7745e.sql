-- Drop the incorrect RLS policy for business users
DROP POLICY IF EXISTS "Business can view standing videos for their challenges" ON storage.objects;

-- Create corrected RLS policy
-- Path structure: standing/{candidateProfileId}/{invitationId}.webm
-- storage.foldername returns ['standing', '{candidateProfileId}']
-- The filename is {invitationId}.webm
CREATE POLICY "Business can view standing videos for their challenges"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'challenge-videos'
  AND (storage.foldername(name))[1] = 'standing'
  AND EXISTS (
    SELECT 1 FROM challenge_submissions cs
    WHERE cs.candidate_profile_id::text = (storage.foldername(name))[2]
    AND cs.invitation_id::text = replace(storage.filename(name), '.webm', '')
    AND cs.business_id = auth.uid()
  )
);