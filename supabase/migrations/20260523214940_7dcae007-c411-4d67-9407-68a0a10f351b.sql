
-- 1. chat_threads: remove broken policy that compared profile_id columns to auth.uid()
DROP POLICY IF EXISTS "chat_threads_participant_select" ON public.chat_threads;

-- 2. feed_consumption: rewrite policies to use profiles.id via helper
DROP POLICY IF EXISTS "feed_consumption_owner_insert" ON public.feed_consumption;
DROP POLICY IF EXISTS "feed_consumption_owner_select" ON public.feed_consumption;
DROP POLICY IF EXISTS "feed_consumption_owner_update" ON public.feed_consumption;

CREATE POLICY "feed_consumption_owner_insert"
ON public.feed_consumption
FOR INSERT TO authenticated
WITH CHECK (profile_id = public.get_profile_id_for_auth_user(auth.uid()));

CREATE POLICY "feed_consumption_owner_select"
ON public.feed_consumption
FOR SELECT TO authenticated
USING (profile_id = public.get_profile_id_for_auth_user(auth.uid()));

CREATE POLICY "feed_consumption_owner_update"
ON public.feed_consumption
FOR UPDATE TO authenticated
USING (profile_id = public.get_profile_id_for_auth_user(auth.uid()))
WITH CHECK (profile_id = public.get_profile_id_for_auth_user(auth.uid()));

-- 3. feed_seen_items: same fix
DROP POLICY IF EXISTS "feed_seen_items_owner_insert" ON public.feed_seen_items;
DROP POLICY IF EXISTS "feed_seen_items_owner_select" ON public.feed_seen_items;

CREATE POLICY "feed_seen_items_owner_insert"
ON public.feed_seen_items
FOR INSERT TO authenticated
WITH CHECK (profile_id = public.get_profile_id_for_auth_user(auth.uid()));

CREATE POLICY "feed_seen_items_owner_select"
ON public.feed_seen_items
FOR SELECT TO authenticated
USING (profile_id = public.get_profile_id_for_auth_user(auth.uid()));

-- 4. feed_external_content: restrict write/ALL policy to service_role only
DROP POLICY IF EXISTS "Service role manages content" ON public.feed_external_content;

CREATE POLICY "Service role manages content"
ON public.feed_external_content
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 5. mentor_credits: remove unrestricted user UPDATE policy (writes are service-role only)
DROP POLICY IF EXISTS "Users can update own credits" ON public.mentor_credits;

-- 6. opportunities: remove fully public SELECT (rely on authenticated + is_public)
DROP POLICY IF EXISTS "opportunities: public read" ON public.opportunities;

-- 7. referrals: hide referred_email from the inviter via column-level privilege
REVOKE SELECT (referred_email) ON public.referrals FROM authenticated, anon;
