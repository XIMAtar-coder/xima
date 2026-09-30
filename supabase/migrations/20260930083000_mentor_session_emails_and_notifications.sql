-- Sessions with a mentor: nobody was told anything. The candidate's request
-- (request_free_intro_session, request_mentor_session) wrote the row and
-- blocked the slot, and the mentor's confirm/reject flipped the status, but
-- no notification and no email followed on either side. One function builds
-- the message for each event; a trigger on mentor_sessions fires it.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'challenge', 'challenge_invitation', 'job_offer', 'message', 'system',
  'submission_received', 'submission_to_review', 'shortlisted', 'followup_requested',
  'passed', 'advanced_level2', 'advanced_level3',
  'session_request', 'session_confirmed', 'session_declined'
]));

CREATE OR REPLACE FUNCTION public.mentor_session_notify(p_session_id uuid, p_event text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  s              record;
  m              record;
  c              record;
  v_to_email     text;
  v_to_user      uuid;
  v_lang         text;
  v_link         text;
  v_when         text;
  v_subject      text;
  v_title        text;
  v_body         text;
  v_cta          text;
  v_footer       text;
  v_html         text;
  v_idem         text := 'mentor_session_' || p_event || '_' || p_session_id::text;
  v_site         constant text := 'https://ximatar.com';
  v_minutes      int;
BEGIN
  SELECT * INTO s FROM public.mentor_sessions WHERE id = p_session_id;
  IF s IS NULL THEN RETURN; END IF;

  SELECT mt.id, mt.user_id, mt.name, coalesce(nullif(trim(mt.email), ''), u.email::text) AS email,
         lower(coalesce(mt.languages[1], 'en')) AS lang
    INTO m
  FROM public.mentors mt LEFT JOIN auth.users u ON u.id = mt.user_id
  WHERE mt.id = s.mentor_id;

  SELECT p.user_id, coalesce(nullif(trim(p.first_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.name), '')) AS name,
         coalesce(nullif(trim(p.email), ''), u.email::text) AS email,
         coalesce(p.preferred_lang::text, 'it') AS lang,
         p.ximatar_name
    INTO c
  FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.id = s.candidate_profile_id;

  v_minutes := coalesce(s.duration_minutes, 30);

  IF p_event = 'requested' THEN
    v_to_email := m.email; v_to_user := m.user_id; v_lang := m.lang;
    v_link := v_site || '/mentor/calendar/' || s.id::text;
  ELSE
    v_to_email := c.email; v_to_user := c.user_id; v_lang := c.lang;
    v_link := v_site || '/profile#mentor';
  END IF;
  IF v_lang NOT IN ('it', 'en', 'es') THEN v_lang := 'en'; END IF;

  -- Rome time for everyone: the slots are published in Europe/Rome.
  v_when := to_char(s.starts_at AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI') || ' (Europe/Rome)';

  IF p_event = 'requested' THEN
    IF v_lang = 'it' THEN
      v_subject := coalesce(c.name, 'Un candidato') || ' ti ha chiesto una sessione su XIMA';
      v_title   := 'Nuova richiesta di sessione';
      v_body    := coalesce(c.name, 'Un candidato') || coalesce(' (' || c.ximatar_name || ')', '') || ' ha chiesto ' ||
                   CASE WHEN s.session_type = 'free_intro' THEN 'la chiamata conoscitiva gratuita' ELSE 'una sessione' END ||
                   ' di ' || v_minutes || ' minuti il ' || v_when || '. Confermala o proponi un altro orario dal tuo calendario.';
      v_cta     := 'Apri la richiesta';
      v_footer  := 'Ricevi questa email perché sei mentor su XIMA e un candidato ti ha scelto.';
    ELSIF v_lang = 'es' THEN
      v_subject := coalesce(c.name, 'Un candidato') || ' te ha pedido una sesión en XIMA';
      v_title   := 'Nueva solicitud de sesión';
      v_body    := coalesce(c.name, 'Un candidato') || coalesce(' (' || c.ximatar_name || ')', '') || ' ha solicitado ' ||
                   CASE WHEN s.session_type = 'free_intro' THEN 'la llamada de presentación gratis' ELSE 'una sesión' END ||
                   ' de ' || v_minutes || ' minutos el ' || v_when || '. Confírmala o propón otro horario desde tu calendario.';
      v_cta     := 'Abrir la solicitud';
      v_footer  := 'Recibes este correo porque eres mentor en XIMA y un candidato te ha elegido.';
    ELSE
      v_subject := coalesce(c.name, 'A candidate') || ' requested a session with you on XIMA';
      v_title   := 'New session request';
      v_body    := coalesce(c.name, 'A candidate') || coalesce(' (' || c.ximatar_name || ')', '') || ' requested ' ||
                   CASE WHEN s.session_type = 'free_intro' THEN 'the free intro call' ELSE 'a session' END ||
                   ' of ' || v_minutes || ' minutes on ' || v_when || '. Confirm it or propose another time from your calendar.';
      v_cta     := 'Open the request';
      v_footer  := 'You receive this email because you are a mentor on XIMA and a candidate chose you.';
    END IF;
  ELSIF p_event = 'confirmed' THEN
    IF v_lang = 'it' THEN
      v_subject := coalesce(m.name, 'Il tuo mentor') || ' ha confermato la sessione';
      v_title   := 'Sessione confermata';
      v_body    := coalesce(m.name, 'Il tuo mentor') || ' ha confermato la sessione di ' || v_minutes || ' minuti del ' || v_when || '. La stanza video si apre nella tua dashboard 10 minuti prima.';
      v_cta     := 'Vai alla sessione';
      v_footer  := 'Ricevi questa email perché hai richiesto una sessione con un mentor su XIMA.';
    ELSIF v_lang = 'es' THEN
      v_subject := coalesce(m.name, 'Tu mentor') || ' ha confirmado la sesión';
      v_title   := 'Sesión confirmada';
      v_body    := coalesce(m.name, 'Tu mentor') || ' ha confirmado la sesión de ' || v_minutes || ' minutos del ' || v_when || '. La sala de vídeo se abre en tu panel 10 minutos antes.';
      v_cta     := 'Ir a la sesión';
      v_footer  := 'Recibes este correo porque solicitaste una sesión con un mentor en XIMA.';
    ELSE
      v_subject := coalesce(m.name, 'Your mentor') || ' confirmed your session';
      v_title   := 'Session confirmed';
      v_body    := coalesce(m.name, 'Your mentor') || ' confirmed the ' || v_minutes || '-minute session on ' || v_when || '. The video room opens in your dashboard 10 minutes before.';
      v_cta     := 'Go to the session';
      v_footer  := 'You receive this email because you requested a session with a mentor on XIMA.';
    END IF;
  ELSIF p_event = 'rejected' THEN
    IF v_lang = 'it' THEN
      v_subject := coalesce(m.name, 'Il tuo mentor') || ' non può fare la sessione del ' || v_when;
      v_title   := 'Sessione non confermata';
      v_body    := coalesce(m.name, 'Il tuo mentor') || ' non può fare la sessione del ' || v_when || '. Scegli un altro orario dalla tua dashboard: la chiamata conoscitiva gratuita resta disponibile.';
      v_cta     := 'Scegli un altro orario';
      v_footer  := 'Ricevi questa email perché hai richiesto una sessione con un mentor su XIMA.';
    ELSIF v_lang = 'es' THEN
      v_subject := coalesce(m.name, 'Tu mentor') || ' no puede hacer la sesión del ' || v_when;
      v_title   := 'Sesión no confirmada';
      v_body    := coalesce(m.name, 'Tu mentor') || ' no puede hacer la sesión del ' || v_when || '. Elige otro horario desde tu panel: la llamada de presentación gratis sigue disponible.';
      v_cta     := 'Elegir otro horario';
      v_footer  := 'Recibes este correo porque solicitaste una sesión con un mentor en XIMA.';
    ELSE
      v_subject := coalesce(m.name, 'Your mentor') || ' cannot make the session on ' || v_when;
      v_title   := 'Session not confirmed';
      v_body    := coalesce(m.name, 'Your mentor') || ' cannot make the session on ' || v_when || '. Pick another time from your dashboard: your free intro call is still available.';
      v_cta     := 'Pick another time';
      v_footer  := 'You receive this email because you requested a session with a mentor on XIMA.';
    END IF;
  ELSE
    RETURN;
  END IF;

  -- In-app notification (the bell) for whoever has an account.
  IF v_to_user IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
    VALUES (v_to_user,
            CASE WHEN p_event = 'requested' THEN c.user_id ELSE m.user_id END,
            CASE p_event WHEN 'requested' THEN 'session_request' WHEN 'confirmed' THEN 'session_confirmed' ELSE 'session_declined' END,
            s.id, v_title, v_body);
  END IF;

  IF v_to_email IS NULL OR position('@' IN v_to_email) = 0 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.suppressed_emails se WHERE se.email = lower(trim(v_to_email))) THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, metadata)
    VALUES (v_idem, 'mentor_session_' || p_event, lower(trim(v_to_email)), 'suppressed', jsonb_build_object('session_id', s.id));
    RETURN;
  END IF;

  v_html :=
    '<!DOCTYPE html><html lang="' || v_lang || '"><head><meta charset="utf-8">'
    || '<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    || '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">'
    || '<div style="background-color: #ffffff; padding: 32px; border-radius: 12px;">'
    || '<p style="font-size: 22px; font-weight: bold; color: #4171d6; margin: 0 0 24px;">XIMA</p>'
    || '<p style="font-size: 18px; font-weight: bold; margin: 0 0 12px;">' || public.email_html_escape(v_title) || '</p>'
    || '<p style="font-size: 16px; margin: 0 0 20px;">' || public.email_html_escape(v_body) || '</p>'
    || '<p style="text-align: center; margin: 32px 0;"><a href="' || v_link || '" style="background-color: #4171d6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">' || public.email_html_escape(v_cta) || '</a></p>'
    || '<p style="font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin: 32px 0 0;">' || public.email_html_escape(v_footer) || '</p>'
    || '</div></body></html>';

  INSERT INTO public.email_outbox (idempotency_key, email_type, recipient_email, subject, html_body, metadata)
  VALUES (v_idem, 'mentor_session_' || p_event, v_to_email, v_subject, v_html,
          jsonb_build_object('session_id', s.id, 'event', p_event, 'purpose', 'transactional', 'source', 'trigger:mentor_session_notify'))
  ON CONFLICT (idempotency_key) DO NOTHING;
  IF found THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, metadata)
    VALUES (v_idem, 'mentor_session_' || p_event, lower(trim(v_to_email)), 'pending', jsonb_build_object('session_id', s.id));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mentor_session_notify(uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_mentor_session_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'requested' THEN
    PERFORM public.mentor_session_notify(NEW.id, 'requested');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('confirmed', 'rejected') THEN
    PERFORM public.mentor_session_notify(NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_session_notify ON public.mentor_sessions;
CREATE TRIGGER trg_mentor_session_notify
  AFTER INSERT OR UPDATE OF status ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_mentor_session_notify();
