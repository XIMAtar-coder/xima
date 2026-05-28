
-- Helper: does current auth user own this business profile?
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = _business_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated, service_role;

-- hiring_goal_drafts
DROP POLICY IF EXISTS "Business users can manage their own hiring goals" ON public.hiring_goal_drafts;
CREATE POLICY "Business users can manage their own hiring goals"
ON public.hiring_goal_drafts FOR ALL TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));

-- hiring_goal_requirements
DROP POLICY IF EXISTS "Business users can create their own requirements" ON public.hiring_goal_requirements;
DROP POLICY IF EXISTS "Business users can delete their own requirements" ON public.hiring_goal_requirements;
DROP POLICY IF EXISTS "Business users can update their own requirements" ON public.hiring_goal_requirements;
DROP POLICY IF EXISTS "Business users can view their own requirements" ON public.hiring_goal_requirements;
CREATE POLICY "Business users can view their own requirements"
ON public.hiring_goal_requirements FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can create their own requirements"
ON public.hiring_goal_requirements FOR INSERT TO authenticated
WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their own requirements"
ON public.hiring_goal_requirements FOR UPDATE TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can delete their own requirements"
ON public.hiring_goal_requirements FOR DELETE TO authenticated
USING (public.is_business_owner(business_id));

-- hiring_offers
DROP POLICY IF EXISTS "Business sees own offers" ON public.hiring_offers;
CREATE POLICY "Business sees own offers"
ON public.hiring_offers FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));

-- business_shortlists
DROP POLICY IF EXISTS "Business users can view their shortlist" ON public.business_shortlists;
DROP POLICY IF EXISTS "Business users can add to shortlist" ON public.business_shortlists;
DROP POLICY IF EXISTS "Business users can remove from shortlist" ON public.business_shortlists;
CREATE POLICY "Business users can view their shortlist"
ON public.business_shortlists FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can add to shortlist"
ON public.business_shortlists FOR INSERT TO authenticated
WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can remove from shortlist"
ON public.business_shortlists FOR DELETE TO authenticated
USING (public.is_business_owner(business_id));

-- candidate_shortlist
DROP POLICY IF EXISTS "Business users can manage their shortlist" ON public.candidate_shortlist;
DROP POLICY IF EXISTS "Candidates can view their shortlist status" ON public.candidate_shortlist;
CREATE POLICY "Business users can manage their shortlist"
ON public.candidate_shortlist FOR ALL TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Candidates can view their shortlist status"
ON public.candidate_shortlist FOR SELECT TO authenticated
USING (candidate_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- challenge_reviews
DROP POLICY IF EXISTS "Business users can select their own reviews" ON public.challenge_reviews;
DROP POLICY IF EXISTS "Business users can insert their own reviews" ON public.challenge_reviews;
DROP POLICY IF EXISTS "Business users can update their own reviews" ON public.challenge_reviews;
DROP POLICY IF EXISTS "Business users can delete their own reviews" ON public.challenge_reviews;
CREATE POLICY "Business users can select their own reviews"
ON public.challenge_reviews FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can insert their own reviews"
ON public.challenge_reviews FOR INSERT TO authenticated
WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their own reviews"
ON public.challenge_reviews FOR UPDATE TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can delete their own reviews"
ON public.challenge_reviews FOR DELETE TO authenticated
USING (public.is_business_owner(business_id));

-- challenge_submissions (business SELECT only)
DROP POLICY IF EXISTS "Business users can view their submissions" ON public.challenge_submissions;
CREATE POLICY "Business users can view their submissions"
ON public.challenge_submissions FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));

-- pipeline_chat_threads
DROP POLICY IF EXISTS "Business sees own pipeline threads" ON public.pipeline_chat_threads;
DROP POLICY IF EXISTS "Participants update own pipeline threads" ON public.pipeline_chat_threads;
CREATE POLICY "Business sees own pipeline threads"
ON public.pipeline_chat_threads FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));
CREATE POLICY "Participants update own pipeline threads"
ON public.pipeline_chat_threads FOR UPDATE TO authenticated
USING (public.is_business_owner(business_id) OR candidate_user_id = auth.uid())
WITH CHECK (public.is_business_owner(business_id) OR candidate_user_id = auth.uid());

-- shortlist_results
DROP POLICY IF EXISTS "Business sees own shortlists" ON public.shortlist_results;
CREATE POLICY "Business sees own shortlists"
ON public.shortlist_results FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));

-- candidate_eligibility (business SELECT)
DROP POLICY IF EXISTS "Business users can view eligibility for their goals" ON public.candidate_eligibility;
CREATE POLICY "Business users can view eligibility for their goals"
ON public.candidate_eligibility FOR SELECT TO authenticated
USING (public.is_business_owner(business_id));

-- Storage: fix candidate challenge-video DELETE policy
DROP POLICY IF EXISTS "Candidates can delete own challenge videos" ON storage.objects;
CREATE POLICY "Candidates can delete own challenge videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'challenge-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(storage.objects.name))[1]
  )
);
