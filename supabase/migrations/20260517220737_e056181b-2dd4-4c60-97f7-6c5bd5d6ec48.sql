
-- 1) Fix mentor-avatars storage policies: use objects.name not mentors.name
DROP POLICY IF EXISTS "Mentors can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their avatar" ON storage.objects;

CREATE POLICY "Mentors can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mentor-avatars'
  AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = auth.uid()
      AND m.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Mentors can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'mentor-avatars'
  AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = auth.uid()
      AND m.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Mentors can delete their avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'mentor-avatars'
  AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = auth.uid()
      AND m.id::text = (storage.foldername(objects.name))[1]
  )
);

-- 2) Fix candidate_selected_mentor_id to return the mentor record id (mentors.id),
--    not the mentor's auth user id, so it matches mentor_availability_slots.mentor_id.
CREATE OR REPLACE FUNCTION public.candidate_selected_mentor_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
  SELECT m.id
  FROM public.mentor_matches mm
  JOIN public.profiles p ON p.id = mm.mentee_user_id
  JOIN public.mentors m ON m.user_id = mm.mentor_user_id
  WHERE p.user_id = p_user_id
  ORDER BY mm.created_at DESC
  LIMIT 1;
$function$;

-- 3) Tighten feed_items: don't broadcast null-user_id rows to all authenticated users.
--    The stricter "Feed items visible with proper visibility enforcement" policy still
--    handles legitimately public/audience-scoped items.
DROP POLICY IF EXISTS "Users see own feed" ON public.feed_items;

CREATE POLICY "Users see own feed"
ON public.feed_items
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
