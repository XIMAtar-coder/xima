DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['i18n_translations','i18n_keys','flow_sections','flow_questions','question_localizations','answer_options','devplan_items','company_sentiment','question_bank','assessment_flows'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ': authenticated read', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "admin read" ON public.%I FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), ''admin''::public.app_role))', t);
  END LOOP;
END $$;