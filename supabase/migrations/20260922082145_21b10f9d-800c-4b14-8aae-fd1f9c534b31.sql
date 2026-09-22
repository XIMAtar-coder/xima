-- 1) mutual_interest: scope to a real candidate user
ALTER TABLE public.mutual_interest
  ADD COLUMN IF NOT EXISTS candidate_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_mutual_interest_candidate_user_id
  ON public.mutual_interest (candidate_user_id);

DROP POLICY IF EXISTS "Candidates can view interest in their ximatar" ON public.mutual_interest;

CREATE POLICY "Candidates can view their own interest records"
ON public.mutual_interest
FOR SELECT
TO authenticated
USING (candidate_user_id = (select auth.uid()));

-- keep RPCs consistent with the new ownership column
CREATE OR REPLACE FUNCTION public.get_pending_interests()
 RETURNS TABLE(id uuid, business_name text, hiring_goal_title text, interested_at timestamp with time zone, accepted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    mi.id,
    bp.company_name as business_name,
    hg.role_title as hiring_goal_title,
    mi.business_interested_at as interested_at,
    mi.candidate_accepted_at IS NOT NULL as accepted
  FROM public.mutual_interest mi
  JOIN public.business_profiles bp ON bp.id = mi.business_id
  LEFT JOIN public.hiring_goal_drafts hg ON hg.id = mi.hiring_goal_id
  WHERE mi.candidate_user_id = auth.uid()
    AND mi.business_interested_at IS NOT NULL
  ORDER BY mi.business_interested_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.accept_interest(p_interest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_interest record; v_candidate_user_id uuid; v_business_user_id uuid; v_thread_id uuid;
BEGIN
  SELECT * INTO v_interest FROM public.mutual_interest WHERE id = p_interest_id;
  IF v_interest IS NULL THEN RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Interest record not found'); END IF;
  v_candidate_user_id := v_interest.candidate_user_id;
  IF v_candidate_user_id IS NULL OR auth.uid() IS NULL OR v_candidate_user_id <> auth.uid() THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF v_interest.business_interested_at IS NULL THEN RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Business has not shown interest yet'); END IF;
  UPDATE public.mutual_interest SET candidate_accepted_at = pg_catalog.now(), updated_at = pg_catalog.now() WHERE id = p_interest_id;
  IF v_interest.chat_thread_id IS NULL THEN
    SELECT user_id INTO v_business_user_id FROM public.business_profiles WHERE id = v_interest.business_id;
    INSERT INTO public.chat_threads (created_by, topic) VALUES (v_candidate_user_id, 'Mutual Interest Chat') RETURNING id INTO v_thread_id;
    INSERT INTO public.chat_participants (thread_id, user_id, role) VALUES (v_thread_id, v_candidate_user_id, 'candidate'), (v_thread_id, v_business_user_id, 'business');
    UPDATE public.mutual_interest SET chat_thread_id = v_thread_id WHERE id = p_interest_id;
    RETURN pg_catalog.jsonb_build_object('success', true, 'chat_created', true, 'thread_id', v_thread_id);
  END IF;
  RETURN pg_catalog.jsonb_build_object('success', true, 'chat_created', false, 'thread_id', v_interest.chat_thread_id);
END;
$function$;

-- 2) feed_items: remove the bare shared-archetype read branch
DROP POLICY IF EXISTS "Feed items visible with proper visibility enforcement" ON public.feed_items;

CREATE POLICY "Feed items visible with proper visibility enforcement"
ON public.feed_items
FOR SELECT
TO authenticated
USING (
  ((visibility ->> 'public')::boolean = true)
  OR (
    (visibility ? 'business_ids')
    AND ((select auth.uid())::text IN (
      SELECT jsonb_array_elements_text(feed_items.visibility -> 'business_ids')
    ))
  )
  OR (
    (visibility ? 'ximatar_ids')
    AND ((subject_ximatar_id)::text IN (
      SELECT jsonb_array_elements_text(feed_items.visibility -> 'ximatar_ids')
    ))
    AND (subject_ximatar_id IN (
      SELECT ar.ximatar_id FROM public.assessment_results ar WHERE ar.user_id = (select auth.uid())
    ))
  )
);

DROP POLICY IF EXISTS feed_items_audience_scoped_select ON public.feed_items;

CREATE POLICY feed_items_audience_scoped_select
ON public.feed_items
FOR SELECT
TO authenticated
USING (
  ((audience_type = 'candidate'::audience_type_enum) AND (candidate_profile_id = public.get_profile_id_for_auth_user((select auth.uid()))))
  OR ((audience_type = 'business'::audience_type_enum) AND (business_id IN (
        SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = (select auth.uid())
      )))
  OR ((audience_type = 'mentor'::audience_type_enum) AND (mentor_profile_id = public.get_profile_id_for_auth_user((select auth.uid()))))
);
