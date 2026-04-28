-- Remove private/sensitive tables from Supabase Realtime publication.
-- These tables contain user-specific CV, assessment, score, and appointment data and should not be broadcast globally.
DO $$
DECLARE
  v_table regclass;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.cv_uploads'::regclass,
    'public.appointments'::regclass,
    'public.assessment_results'::regclass,
    'public.assessments'::regclass,
    'public.pillar_scores'::regclass
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = split_part(v_table::text, '.', 1)
        AND tablename = split_part(v_table::text, '.', 2)
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %s', v_table);
    END IF;
  END LOOP;
END $$;

-- Harden bot_events access. Null-user bot events may contain behavioral payloads and must not be publicly readable.
DROP POLICY IF EXISTS "bot_events: owner read" ON public.bot_events;
DROP POLICY IF EXISTS "bot_events: owner insert" ON public.bot_events;
DROP POLICY IF EXISTS "bot_events: service role all" ON public.bot_events;

CREATE POLICY "bot_events: authenticated owner read"
ON public.bot_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "bot_events: authenticated owner insert"
ON public.bot_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "bot_events: service role all"
ON public.bot_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Remove anonymous/public direct execution from SECURITY DEFINER functions in the exposed public schema.
-- Existing authenticated app RPC flows are kept explicit; service_role keeps backend access.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Keep currently used signed-in frontend RPC flows available.
GRANT EXECUTE ON FUNCTION public.accept_interest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_feed_reaction(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_on_signup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_accept_reschedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_cancel_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_reject_reschedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chat_thread(text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_candidate_invitations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_candidate_visibility() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feed_item_reactions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_feed_item() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_interests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_engagement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_cancel_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_complete_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_confirm_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_reject_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_reschedule_session(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_business_account(uuid, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_free_intro_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_mentor_session(uuid) TO authenticated;