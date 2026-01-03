-- Create storage bucket for Level 3 Standing videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-videos', 'challenge-videos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for challenge-videos bucket
-- Candidates can upload their own videos
CREATE POLICY "Candidates can upload their own standing videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'challenge-videos' 
  AND (storage.foldername(name))[1] = 'standing'
  AND (storage.foldername(name))[2] = (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Candidates can view their own videos
CREATE POLICY "Candidates can view their own standing videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'challenge-videos' 
  AND (storage.foldername(name))[1] = 'standing'
  AND (storage.foldername(name))[2] = (
    SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Business users can view videos for their challenges
CREATE POLICY "Business can view standing videos for their challenges"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'challenge-videos' 
  AND (storage.foldername(name))[1] = 'standing'
  AND EXISTS (
    SELECT 1 FROM public.challenge_submissions cs
    WHERE cs.candidate_profile_id::text = (storage.foldername(name))[2]
    AND cs.invitation_id::text = REPLACE((storage.foldername(name))[3], '.webm', '')
    AND cs.business_id = auth.uid()
  )
);