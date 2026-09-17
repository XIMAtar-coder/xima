-- 1) company_profiles: require business role for the self-id path
DROP POLICY IF EXISTS "Business users can insert their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can update their own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Business users can view their own company profile" ON public.company_profiles;

CREATE POLICY "Business users can view their own company profile"
ON public.company_profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = company_profiles.company_id AND b.user_id = (SELECT auth.uid()))
  OR (company_id = (SELECT auth.uid()) AND public.has_role((SELECT auth.uid()), 'business'::public.app_role))
);

CREATE POLICY "Business users can insert their own company profile"
ON public.company_profiles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = company_profiles.company_id AND b.user_id = (SELECT auth.uid()))
  OR (company_id = (SELECT auth.uid()) AND public.has_role((SELECT auth.uid()), 'business'::public.app_role))
);

CREATE POLICY "Business users can update their own company profile"
ON public.company_profiles FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = company_profiles.company_id AND b.user_id = (SELECT auth.uid()))
  OR (company_id = (SELECT auth.uid()) AND public.has_role((SELECT auth.uid()), 'business'::public.app_role))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = company_profiles.company_id AND b.user_id = (SELECT auth.uid()))
  OR (company_id = (SELECT auth.uid()) AND public.has_role((SELECT auth.uid()), 'business'::public.app_role))
);

-- 2) feed_reactions: insert only with the caller's own derived hash
DROP POLICY IF EXISTS "Authenticated users can react" ON public.feed_reactions;

CREATE POLICY "Authenticated users can react as themselves"
ON public.feed_reactions FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND reactor_hash = encode(
        sha256((((SELECT auth.uid())::text) || feed_item_id::text || 'xima_salt')::bytea),
        'hex')
);