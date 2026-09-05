DROP POLICY IF EXISTS "Anon users can view feed reactions" ON public.feed_reactions;
REVOKE SELECT ON public.feed_reactions FROM anon;