-- RLS hides candidate profiles from mentors, so every session showed
-- "Anonymous". Give the mentor just the name and XIMAtar of the people
-- who booked with them, nothing else from the profile.
CREATE OR REPLACE FUNCTION public.mentor_session_candidates(p_session_ids uuid[])
RETURNS TABLE (session_id uuid, candidate_name text, ximatar_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ms.id,
         coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.name), ''), nullif(trim(p.first_name), '')),
         p.ximatar_name
  FROM public.mentor_sessions ms
  JOIN public.mentors m ON m.id = ms.mentor_id AND m.user_id = auth.uid()
  JOIN public.profiles p ON p.id = ms.candidate_profile_id
  WHERE ms.id = ANY (p_session_ids);
$$;
REVOKE ALL ON FUNCTION public.mentor_session_candidates(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mentor_session_candidates(uuid[]) TO authenticated;
