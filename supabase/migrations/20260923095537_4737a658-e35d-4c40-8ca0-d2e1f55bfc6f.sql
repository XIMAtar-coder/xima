DROP POLICY IF EXISTS "tests: authenticated read" ON public.tests;
CREATE POLICY "tests: admin read" ON public.tests FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));
REVOKE SELECT ON public.tests FROM anon;