-- 1. i18n tables: require sign-in
DROP POLICY IF EXISTS "i18n_keys: public read" ON public.i18n_keys;
CREATE POLICY "i18n_keys: authenticated read" ON public.i18n_keys FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.i18n_keys FROM anon;

DROP POLICY IF EXISTS "i18n_translations: public read" ON public.i18n_translations;
CREATE POLICY "i18n_translations: authenticated read" ON public.i18n_translations FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.i18n_translations FROM anon;

-- 2. Assessment content catalogs: require sign-in
DROP POLICY IF EXISTS "flows: read" ON public.assessment_flows;
CREATE POLICY "flows: authenticated read" ON public.assessment_flows FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.assessment_flows FROM anon;

DROP POLICY IF EXISTS "flow_sections: read" ON public.flow_sections;
CREATE POLICY "flow_sections: authenticated read" ON public.flow_sections FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.flow_sections FROM anon;

DROP POLICY IF EXISTS "flow_questions: read" ON public.flow_questions;
CREATE POLICY "flow_questions: authenticated read" ON public.flow_questions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.flow_questions FROM anon;

DROP POLICY IF EXISTS "question_bank: read" ON public.question_bank;
CREATE POLICY "question_bank: authenticated read" ON public.question_bank FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.question_bank FROM anon;

DROP POLICY IF EXISTS "question_localizations: read" ON public.question_localizations;
CREATE POLICY "question_localizations: authenticated read" ON public.question_localizations FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.question_localizations FROM anon;

DROP POLICY IF EXISTS "answer_options: read" ON public.answer_options;
CREATE POLICY "answer_options: authenticated read" ON public.answer_options FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.answer_options FROM anon;

-- 3. Growth plan items, company sentiment, feed articles: require sign-in
DROP POLICY IF EXISTS "devplan_items: public read" ON public.devplan_items;
CREATE POLICY "devplan_items: authenticated read" ON public.devplan_items FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.devplan_items FROM anon;

DROP POLICY IF EXISTS "sentiment: public read" ON public.company_sentiment;
CREATE POLICY "sentiment: authenticated read" ON public.company_sentiment FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.company_sentiment FROM anon;

DROP POLICY IF EXISTS "Anyone can read external content" ON public.feed_external_content;
CREATE POLICY "Authenticated users can read external content" ON public.feed_external_content FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.feed_external_content FROM anon;

-- 4. AI model price list: administrators only (clients never read it)
DROP POLICY IF EXISTS "model_prices read authenticated" ON public.model_prices;
CREATE POLICY "model_prices admin read" ON public.model_prices FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'));
REVOKE SELECT ON public.model_prices FROM anon;