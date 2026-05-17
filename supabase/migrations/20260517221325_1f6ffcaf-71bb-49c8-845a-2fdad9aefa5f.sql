
-- 1) Remove conflicting chat_messages INSERT policy that uses auth.uid() in the
--    profile-id space. Keep the correct "Participants can send thread messages".
DROP POLICY IF EXISTS "chat_messages_participant_insert" ON public.chat_messages;

-- 2) Make service-role-only INSERT on mentor_credits explicit.
DROP POLICY IF EXISTS "Service role can insert credits" ON public.mentor_credits;
CREATE POLICY "Service role can insert credits"
ON public.mentor_credits
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3) Rewrite feed_items audience-scoped SELECT to compare profile/business IDs
--    correctly (candidate_profile_id and mentor_profile_id are profiles.id;
--    business_id is business_profiles.id).
DROP POLICY IF EXISTS feed_items_audience_scoped_select ON public.feed_items;

CREATE POLICY feed_items_audience_scoped_select
ON public.feed_items
FOR SELECT
TO authenticated
USING (
  (
    audience_type = 'candidate'::audience_type_enum
    AND candidate_profile_id = public.get_profile_id_for_auth_user(auth.uid())
  )
  OR (
    audience_type = 'business'::audience_type_enum
    AND business_id IN (
      SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = auth.uid()
    )
  )
  OR (
    audience_type = 'mentor'::audience_type_enum
    AND mentor_profile_id = public.get_profile_id_for_auth_user(auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.assessment_results ar
    WHERE ar.user_id = auth.uid()
      AND ar.ximatar_id = feed_items.subject_ximatar_id
  )
);
