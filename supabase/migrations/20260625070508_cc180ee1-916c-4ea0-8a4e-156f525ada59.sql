
-- 1) Storage: candidates can SELECT their own non-standing challenge videos
--    Mirrors the existing delete/update policy (folder[1] = profile.id)
CREATE POLICY "Candidates can view their own challenge videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'challenge-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
      AND (p.id)::text = (storage.foldername(objects.name))[1]
  )
);

-- 2) shortlist_results: candidates can read their own shortlist row
CREATE POLICY "Candidates can read their own shortlist"
ON public.shortlist_results FOR SELECT
TO authenticated
USING (candidate_user_id = (SELECT auth.uid()));

-- 3) mentors_public view: ensure SELECT grants exist for authenticated clients
GRANT SELECT ON public.mentors_public TO authenticated;
GRANT SELECT ON public.mentors_public TO anon;
