-- A session nobody closed stayed "confirmed" for ever: it kept the
-- candidate's free intro call blocked (request_free_intro_session refuses a
-- second active one) and sat in the mentor's lists as upcoming. Four from
-- February were still open on 01/10/2026. Close them from the facts:
--   * confirmed, over for an hour, both sides entered the room -> completed
--     (the existing trigger then marks the free intro as used);
--   * confirmed, over for an hour, someone never came            -> cancelled
--     (the free intro stays available);
--   * requested and its time has passed without an answer        -> rejected,
--     which tells the candidate to pick another time.
CREATE OR REPLACE FUNCTION public.close_past_mentor_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  s record;
  v_both boolean;
  v_count integer := 0;
BEGIN
  FOR s IN
    SELECT id, status, session_type
    FROM public.mentor_sessions
    WHERE (status IN ('confirmed', 'rescheduled') AND ends_at < now() - interval '60 minutes')
       OR (status = 'requested' AND starts_at < now())
    FOR UPDATE SKIP LOCKED
  LOOP
    IF s.status = 'requested' THEN
      UPDATE public.mentor_sessions
         SET status = 'rejected', requires_reschedule = (s.session_type = 'free_intro'), updated_at = now()
       WHERE id = s.id;
      INSERT INTO public.mentor_session_audit_logs (session_id, actor_user_id, actor_role, action, meta)
      VALUES (s.id, NULL, 'system', 'request_expired', '{}'::jsonb);
    ELSE
      SELECT count(DISTINCT actor_role) >= 2 INTO v_both
      FROM public.mentor_session_audit_logs
      WHERE session_id = s.id AND action = 'video_room_joined' AND actor_role IN ('mentor', 'candidate');

      IF v_both THEN
        UPDATE public.mentor_sessions SET status = 'completed', updated_at = now() WHERE id = s.id;
        INSERT INTO public.mentor_session_audit_logs (session_id, actor_user_id, actor_role, action, meta)
        VALUES (s.id, NULL, 'system', 'complete', '{"auto": true}'::jsonb);
      ELSE
        UPDATE public.mentor_sessions SET status = 'cancelled', updated_at = now() WHERE id = s.id;
        INSERT INTO public.mentor_session_audit_logs (session_id, actor_user_id, actor_role, action, meta)
        VALUES (s.id, NULL, 'system', 'no_show', '{}'::jsonb);
      END IF;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.close_past_mentor_sessions() FROM public, anon, authenticated;

SELECT cron.unschedule('close-past-mentor-sessions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-past-mentor-sessions');
SELECT cron.schedule('close-past-mentor-sessions', '*/15 * * * *', $$SELECT public.close_past_mentor_sessions();$$);
