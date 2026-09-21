
-- 1. get_candidate_invitations: always scope to the caller
CREATE OR REPLACE FUNCTION public.get_candidate_invitations(p_user_id uuid)
RETURNS TABLE(id uuid, business_id uuid, hiring_goal_id uuid, status text, invite_token uuid, created_at timestamp with time zone, company_name text, role_title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT ci.id, ci.business_id, ci.hiring_goal_id, ci.status, ci.invite_token, ci.created_at,
         COALESCE(bp.company_name, 'Company'), hg.role_title
  FROM public.challenge_invitations ci
  JOIN public.profiles p ON p.id = ci.candidate_profile_id
  LEFT JOIN public.business_profiles bp ON bp.user_id = ci.business_id
  LEFT JOIN public.hiring_goal_drafts hg ON hg.id = ci.hiring_goal_id
  WHERE p.user_id = v_uid
  ORDER BY ci.created_at DESC;
END;
$function$;

-- 2. enqueue_email (6-arg): service_role only
REVOKE ALL ON FUNCTION public.enqueue_email(text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text,text,text,text,text,jsonb) TO service_role;

-- 3. register_business_account: self only
CREATE OR REPLACE FUNCTION public.register_business_account(p_user_id uuid, p_company_name text, p_website_url text DEFAULT NULL::text, p_recruiter_email text DEFAULT NULL::text, p_industry text DEFAULT NULL::text, p_company_size text DEFAULT NULL::text, p_headquarters_country text DEFAULT NULL::text, p_headquarters_city text DEFAULT NULL::text, p_hiring_approach text DEFAULT NULL::text, p_team_culture text DEFAULT NULL::text, p_growth_stage text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'business')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO business_profiles (
    user_id, company_name, website, manual_industry, company_size,
    manual_hq_country, manual_hq_city, hiring_approach, team_culture,
    growth_stage, hr_contact_email, created_at, updated_at
  ) VALUES (
    p_user_id, p_company_name, p_website_url, p_industry, p_company_size,
    p_headquarters_country, p_headquarters_city, p_hiring_approach, p_team_culture,
    p_growth_stage, p_recruiter_email, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    website = COALESCE(EXCLUDED.website, business_profiles.website),
    manual_industry = COALESCE(EXCLUDED.manual_industry, business_profiles.manual_industry),
    company_size = COALESCE(EXCLUDED.company_size, business_profiles.company_size),
    manual_hq_country = COALESCE(EXCLUDED.manual_hq_country, business_profiles.manual_hq_country),
    manual_hq_city = COALESCE(EXCLUDED.manual_hq_city, business_profiles.manual_hq_city),
    hiring_approach = COALESCE(EXCLUDED.hiring_approach, business_profiles.hiring_approach),
    team_culture = COALESCE(EXCLUDED.team_culture, business_profiles.team_culture),
    growth_stage = COALESCE(EXCLUDED.growth_stage, business_profiles.growth_stage),
    hr_contact_email = COALESCE(EXCLUDED.hr_contact_email, business_profiles.hr_contact_email),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$function$;

-- 4. activity_logs: drop duplicate INSERT policy
DROP POLICY IF EXISTS "Users can log own activity" ON public.activity_logs;

-- 5. company_profiles: ownership strictly via the caller's own business account
DROP POLICY IF EXISTS "Business users can view their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can update their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can insert their own company profile" ON public.company_profiles;

CREATE POLICY "Business users can view their own company profile"
ON public.company_profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.business_profiles b
  WHERE b.user_id = (select auth.uid()) AND b.user_id = company_profiles.company_id
));

CREATE POLICY "Business users can update their own company profile"
ON public.company_profiles FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.business_profiles b
  WHERE b.user_id = (select auth.uid()) AND b.user_id = company_profiles.company_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.business_profiles b
  WHERE b.user_id = (select auth.uid()) AND b.user_id = company_profiles.company_id
));

CREATE POLICY "Business users can insert their own company profile"
ON public.company_profiles FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.business_profiles b
  WHERE b.user_id = (select auth.uid()) AND b.user_id = company_profiles.company_id
));

-- 6. contact_sales_requests: accept the profile email as well as the JWT claim
DROP POLICY IF EXISTS "Authenticated can insert" ON public.contact_sales_requests;
CREATE POLICY "Authenticated can insert"
ON public.contact_sales_requests FOR INSERT TO authenticated
WITH CHECK (
  ((business_id IS NULL) OR (business_id IN (
    SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = (select auth.uid())
  )))
  AND (
    lower(requester_email) = lower(COALESCE(((select auth.jwt()) ->> 'email'), ''))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (select auth.uid()) AND lower(p.email) = lower(requester_email)
    )
  )
);

-- 7. notifications: businesses may only notify candidates they are connected to
CREATE OR REPLACE FUNCTION public.business_has_candidate_relationship(p_business_uid uuid, p_recipient_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_invitations ci
    JOIN public.profiles p ON p.id = ci.candidate_profile_id
    WHERE ci.business_id = p_business_uid AND p.user_id = p_recipient_uid
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_threads ct
    JOIN public.profiles p ON p.id = ct.candidate_profile_id
    WHERE ct.business_id = p_business_uid AND p.user_id = p_recipient_uid
  )
  OR EXISTS (
    SELECT 1 FROM public.candidate_shortlist cs
    JOIN public.profiles p ON (p.id = cs.candidate_id OR p.user_id = cs.candidate_id)
    WHERE cs.business_id = p_business_uid AND p.user_id = p_recipient_uid
  )
  OR EXISTS (
    SELECT 1 FROM public.hiring_offers ho
    WHERE ho.business_id = p_business_uid AND ho.candidate_user_id = p_recipient_uid
  );
$function$;

REVOKE ALL ON FUNCTION public.business_has_candidate_relationship(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_has_candidate_relationship(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Businesses can send notifications" ON public.notifications;
CREATE POLICY "Businesses can send notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) = sender_id
  AND (
    public.has_role((select auth.uid()), 'admin')
    OR (
      public.has_role((select auth.uid()), 'business')
      AND public.business_has_candidate_relationship((select auth.uid()), recipient_id)
    )
  )
);
