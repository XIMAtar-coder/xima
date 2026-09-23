CREATE OR REPLACE FUNCTION public.record_business_interest(p_feed_item_id uuid, p_hiring_goal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_business_id uuid;
  v_candidate_ximatar_id uuid;
  v_candidate_profile_id uuid;
  v_candidate_user_id uuid;
  v_interest_id uuid;
BEGIN
  SELECT id INTO v_business_id FROM public.business_profiles WHERE user_id = auth.uid();
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'User is not a business'; END IF;

  SELECT subject_ximatar_id, candidate_profile_id
    INTO v_candidate_ximatar_id, v_candidate_profile_id
  FROM public.feed_items WHERE id = p_feed_item_id;
  IF v_candidate_ximatar_id IS NULL THEN RAISE EXCEPTION 'Feed item not found'; END IF;

  -- Resolve the specific candidate user this interest refers to.
  IF v_candidate_profile_id IS NOT NULL THEN
    SELECT p.user_id INTO v_candidate_user_id
    FROM public.profiles p WHERE p.id = v_candidate_profile_id;
  END IF;
  IF v_candidate_user_id IS NULL THEN
    SELECT ar.user_id INTO v_candidate_user_id
    FROM public.assessment_results ar
    WHERE ar.ximatar_id = v_candidate_ximatar_id
    ORDER BY ar.computed_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  INSERT INTO public.mutual_interest (
    business_id, candidate_ximatar_id, candidate_user_id,
    hiring_goal_id, feed_item_id, business_interested_at
  )
  VALUES (
    v_business_id, v_candidate_ximatar_id, v_candidate_user_id,
    p_hiring_goal_id, p_feed_item_id, pg_catalog.now()
  )
  ON CONFLICT (business_id, candidate_ximatar_id, hiring_goal_id)
  DO UPDATE SET
    business_interested_at = COALESCE(public.mutual_interest.business_interested_at, pg_catalog.now()),
    candidate_user_id = COALESCE(public.mutual_interest.candidate_user_id, EXCLUDED.candidate_user_id),
    updated_at = pg_catalog.now()
  RETURNING id INTO v_interest_id;
  RETURN v_interest_id;
END;
$function$;