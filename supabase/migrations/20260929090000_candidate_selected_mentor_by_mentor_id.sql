-- assign-mentor writes mentor_matches.mentor_user_id = mentors.id, while the
-- helper joined on mentors.user_id, so candidates could never read their
-- mentor's open slots. Accept both keys.
CREATE OR REPLACE FUNCTION public.candidate_selected_mentor_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.mentor_matches mm
  JOIN public.profiles p ON p.id = mm.mentee_user_id
  JOIN public.mentors m ON m.id = mm.mentor_user_id OR m.user_id = mm.mentor_user_id
  WHERE p.user_id = p_user_id
  ORDER BY mm.created_at DESC
  LIMIT 1;
$$;

-- The older policy compared mentee_user_id (a profiles.id) with auth.uid();
-- it never matched. Replace it with the helper so both policies agree.
DROP POLICY IF EXISTS "Users can view their mentor's availability" ON public.mentor_availability_slots;
CREATE POLICY "Users can view their mentor's availability"
  ON public.mentor_availability_slots FOR SELECT
  USING (status = 'open' AND mentor_id = public.candidate_selected_mentor_id((SELECT auth.uid())));

-- Candidates need to read the public card of the mentor they chose.
DROP POLICY IF EXISTS "Candidate can read selected mentor" ON public.mentors;
CREATE POLICY "Candidate can read selected mentor"
  ON public.mentors FOR SELECT
  USING (id = public.candidate_selected_mentor_id((SELECT auth.uid())));
