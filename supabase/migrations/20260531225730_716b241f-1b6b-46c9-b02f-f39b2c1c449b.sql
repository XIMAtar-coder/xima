
-- Fix INCORRECT_RLS_IDENTITY_CHECK across business-side tables
-- business_id columns reference business_profiles.id, not auth.uid()

-- business_challenges
DROP POLICY IF EXISTS "Business users can create challenges" ON public.business_challenges;
DROP POLICY IF EXISTS "Business users can delete their own challenges" ON public.business_challenges;
DROP POLICY IF EXISTS "Business users can update their own challenges" ON public.business_challenges;
DROP POLICY IF EXISTS "Invited candidates can view their assigned challenges" ON public.business_challenges;
CREATE POLICY "Business users can create challenges" ON public.business_challenges
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can delete their own challenges" ON public.business_challenges
  FOR DELETE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their own challenges" ON public.business_challenges
  FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "Invited candidates can view their assigned challenges" ON public.business_challenges
  FOR SELECT USING (
    public.is_business_owner(business_id) OR EXISTS (
      SELECT 1 FROM public.challenge_invitations ci
      JOIN public.profiles p ON p.id = ci.candidate_profile_id
      WHERE ci.challenge_id = business_challenges.id AND p.user_id = auth.uid()
    )
  );

-- business_job_post_imports
DROP POLICY IF EXISTS "Business users can create their own imports" ON public.business_job_post_imports;
DROP POLICY IF EXISTS "Business users can delete their own imports" ON public.business_job_post_imports;
DROP POLICY IF EXISTS "Business users can update their own imports" ON public.business_job_post_imports;
DROP POLICY IF EXISTS "Business users can view their own imports" ON public.business_job_post_imports;
CREATE POLICY "Business users can create their own imports" ON public.business_job_post_imports
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can delete their own imports" ON public.business_job_post_imports
  FOR DELETE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their own imports" ON public.business_job_post_imports
  FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can view their own imports" ON public.business_job_post_imports
  FOR SELECT USING (public.is_business_owner(business_id));

-- candidate_challenges (business-side)
DROP POLICY IF EXISTS "Business users can assign challenges" ON public.candidate_challenges;
DROP POLICY IF EXISTS "Business users can update challenge assignments" ON public.candidate_challenges;
DROP POLICY IF EXISTS "Business users can view challenges they created" ON public.candidate_challenges;
CREATE POLICY "Business users can assign challenges" ON public.candidate_challenges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_challenges bc
            WHERE bc.id = candidate_challenges.challenge_id
              AND public.is_business_owner(bc.business_id))
  );
CREATE POLICY "Business users can update challenge assignments" ON public.candidate_challenges
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.business_challenges bc
            WHERE bc.id = candidate_challenges.challenge_id
              AND public.is_business_owner(bc.business_id))
  );
CREATE POLICY "Business users can view challenges they created" ON public.candidate_challenges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.business_challenges bc
            WHERE bc.id = candidate_challenges.challenge_id
              AND public.is_business_owner(bc.business_id))
  );

-- challenge_followups
DROP POLICY IF EXISTS "Business users can create followups" ON public.challenge_followups;
DROP POLICY IF EXISTS "Business users can update their followups" ON public.challenge_followups;
DROP POLICY IF EXISTS "Business users can view their followups" ON public.challenge_followups;
CREATE POLICY "Business users can create followups" ON public.challenge_followups
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their followups" ON public.challenge_followups
  FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can view their followups" ON public.challenge_followups
  FOR SELECT USING (public.is_business_owner(business_id));

-- challenge_invitations
DROP POLICY IF EXISTS "Business users can create invitations" ON public.challenge_invitations;
DROP POLICY IF EXISTS "Business users can update their invitations" ON public.challenge_invitations;
DROP POLICY IF EXISTS "Business users can view their invitations" ON public.challenge_invitations;
CREATE POLICY "Business users can create invitations" ON public.challenge_invitations
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their invitations" ON public.challenge_invitations
  FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can view their invitations" ON public.challenge_invitations
  FOR SELECT USING (public.is_business_owner(business_id));

-- company_dna_history
DROP POLICY IF EXISTS "Business users can insert own DNA history" ON public.company_dna_history;
DROP POLICY IF EXISTS "Business users can view own DNA history" ON public.company_dna_history;
CREATE POLICY "Business users can insert own DNA history" ON public.company_dna_history
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can view own DNA history" ON public.company_dna_history
  FOR SELECT USING (public.is_business_owner(business_id));

-- company_profiles (company_id references business_profiles.id)
DROP POLICY IF EXISTS "Business users can insert their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can update their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can view their own company profile" ON public.company_profiles;
CREATE POLICY "Business users can insert their own company profile" ON public.company_profiles
  FOR INSERT WITH CHECK (public.is_business_owner(company_id));
CREATE POLICY "Business users can update their own company profile" ON public.company_profiles
  FOR UPDATE USING (public.is_business_owner(company_id));
CREATE POLICY "Business users can view their own company profile" ON public.company_profiles
  FOR SELECT USING (public.is_business_owner(company_id));

-- eligibility_documents
DROP POLICY IF EXISTS "Business users can view documents for their goals" ON public.eligibility_documents;
CREATE POLICY "Business users can view documents for their goals" ON public.eligibility_documents
  FOR SELECT USING (
    eligibility_id IN (
      SELECT ce.id FROM public.candidate_eligibility ce
      WHERE public.is_business_owner(ce.business_id)
    )
  );

-- job_post_drafts
DROP POLICY IF EXISTS "Users delete own drafts" ON public.job_post_drafts;
DROP POLICY IF EXISTS "Users insert own drafts" ON public.job_post_drafts;
DROP POLICY IF EXISTS "Users see own drafts" ON public.job_post_drafts;
DROP POLICY IF EXISTS "Users update own drafts" ON public.job_post_drafts;
CREATE POLICY "Users delete own drafts" ON public.job_post_drafts
  FOR DELETE USING (public.is_business_owner(business_id));
CREATE POLICY "Users insert own drafts" ON public.job_post_drafts
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Users see own drafts" ON public.job_post_drafts
  FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "Users update own drafts" ON public.job_post_drafts
  FOR UPDATE USING (public.is_business_owner(business_id));

-- job_posts
DROP POLICY IF EXISTS "Business users can create their own job posts" ON public.job_posts;
DROP POLICY IF EXISTS "Business users can delete their own job posts" ON public.job_posts;
DROP POLICY IF EXISTS "Business users can update their own job posts" ON public.job_posts;
DROP POLICY IF EXISTS "Business users can view their own job posts" ON public.job_posts;
CREATE POLICY "Business users can create their own job posts" ON public.job_posts
  FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Business users can delete their own job posts" ON public.job_posts
  FOR DELETE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can update their own job posts" ON public.job_posts
  FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "Business users can view their own job posts" ON public.job_posts
  FOR SELECT USING (public.is_business_owner(business_id));

-- Fix is_pipeline_thread_participant: business_id is business_profiles.id, not auth uid
CREATE OR REPLACE FUNCTION public.is_pipeline_thread_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.pipeline_chat_threads t
    WHERE t.id = _thread_id
      AND (
        t.candidate_user_id = _user_id
        OR t.business_id IN (SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = _user_id)
      )
  );
$function$;
