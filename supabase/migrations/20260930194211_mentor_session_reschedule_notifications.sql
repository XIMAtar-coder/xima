-- A proposed new time, and the candidate's answer to it, were silent too:
-- mentor_reschedule_session only flips reschedule_status. Same function,
-- three more events, and the trigger also watches reschedule_status.
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
  v_from_user    uuid;
  v_lang         text;
  v_link         text;
  v_when         text;
  v_new_when     text;
  v_subject      text;
  v_title        text;
  v_body         text;
  v_cta          text;
  v_footer       text;
  v_html         text;
  v_type         text;
  v_idem         text := 'mentor_session_' || p_event || '_' || p_session_id::text;
  v_site         constant text := 'https://ximatar.com';
  v_minutes      int;
  v_to_mentor    boolean;
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
  v_to_mentor := p_event IN ('requested', 'reschedule_accepted', 'reschedule_declined');

  IF v_to_mentor THEN
    v_to_email := m.email; v_to_user := m.user_id; v_from_user := c.user_id; v_lang := m.lang;
    v_link := v_site || '/mentor/calendar/' || s.id::text;
    v_type := 'session_request';
  ELSE
    v_to_email := c.email; v_to_user := c.user_id; v_from_user := m.user_id; v_lang := c.lang;
    v_link := v_site || '/profile#mentor';
    v_type := CASE WHEN p_event = 'rejected' THEN 'session_declined' ELSE 'session_confirmed' END;
  END IF;
  IF v_lang NOT IN ('it', 'en', 'es') THEN v_lang := 'en'; END IF;

  -- Rome time for everyone: the slots are published in Europe/Rome.
  v_when := to_char(s.starts_at AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI') || ' (Europe/Rome)';
  v_new_when := to_char(s.proposed_start_at AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI') || ' (Europe/Rome)';

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
  ELSIF p_event = 'reschedule_proposed' THEN
    IF v_lang = 'it' THEN
      v_subject := coalesce(m.name, 'Il tuo mentor') || ' propone un nuovo orario per la sessione';
      v_title   := 'Nuovo orario proposto';
      v_body    := coalesce(m.name, 'Il tuo mentor') || ' propone di spostare la sessione dal ' || v_when || ' al ' || v_new_when || '. Accetta o rifiuta dalla tua dashboard: finché non rispondi resta valido l''orario di prima.';
      v_cta     := 'Rispondi alla proposta';
      v_footer  := 'Ricevi questa email perché hai una sessione con un mentor su XIMA.';
    ELSIF v_lang = 'es' THEN
      v_subject := coalesce(m.name, 'Tu mentor') || ' propone otro horario para la sesión';
      v_title   := 'Nuevo horario propuesto';
      v_body    := coalesce(m.name, 'Tu mentor') || ' propone mover la sesión del ' || v_when || ' al ' || v_new_when || '. Acepta o rechaza desde tu panel: hasta que respondas sigue valiendo el horario anterior.';
      v_cta     := 'Responder a la propuesta';
      v_footer  := 'Recibes este correo porque tienes una sesión con un mentor en XIMA.';
    ELSE
      v_subject := coalesce(m.name, 'Your mentor') || ' proposes a new time for your session';
      v_title   := 'New time proposed';
      v_body    := coalesce(m.name, 'Your mentor') || ' proposes moving the session from ' || v_when || ' to ' || v_new_when || '. Accept or decline from your dashboard: until you answer, the earlier time stands.';
      v_cta     := 'Answer the proposal';
      v_footer  := 'You receive this email because you have a session with a mentor on XIMA.';
    END IF;
  ELSIF p_event = 'reschedule_accepted' THEN
    IF v_lang = 'it' THEN
      v_subject := coalesce(c.name, 'Il candidato') || ' ha accettato il nuovo orario';
      v_title   := 'Nuovo orario accettato';
      v_body    := coalesce(c.name, 'Il candidato') || ' ha accettato: la sessione è ora il ' || v_when || '.';
      v_cta     := 'Apri la sessione';
      v_footer  := 'Ricevi questa email perché sei mentor su XIMA.';
    ELSIF v_lang = 'es' THEN
      v_subject := coalesce(c.name, 'El candidato') || ' ha aceptado el nuevo horario';
      v_title   := 'Nuevo horario aceptado';
      v_body    := coalesce(c.name, 'El candidato') || ' ha aceptado: la sesión es ahora el ' || v_when || '.';
      v_cta     := 'Abrir la sesión';
      v_footer  := 'Recibes este correo porque eres mentor en XIMA.';
    ELSE
      v_subject := coalesce(c.name, 'The candidate') || ' accepted the new time';
      v_title   := 'New time accepted';
      v_body    := coalesce(c.name, 'The candidate') || ' accepted: the session is now on ' || v_when || '.';
      v_cta     := 'Open the session';
      v_footer  := 'You receive this email because you are a mentor on XIMA.';
    END IF;
  ELSIF p_event = 'reschedule_declined' THEN
    IF v_lang = 'it' THEN
      v_subject := coalesce(c.name, 'Il candidato') || ' non può al nuovo orario';
      v_title   := 'Nuovo orario rifiutato';
      v_body    := coalesce(c.name, 'Il candidato') || ' ha rifiutato lo spostamento: resta valido il ' || v_when || '. Se non puoi, proponi un altro orario o annulla la sessione.';
      v_cta     := 'Apri la sessione';
      v_footer  := 'Ricevi questa email perché sei mentor su XIMA.';
    ELSIF v_lang = 'es' THEN
      v_subject := coalesce(c.name, 'El candidato') || ' no puede en el nuevo horario';
      v_title   := 'Nuevo horario rechazado';
      v_body    := coalesce(c.name, 'El candidato') || ' ha rechazado el cambio: sigue valiendo el ' || v_when || '. Si no puedes, propón otro horario o cancela la sesión.';
      v_cta     := 'Abrir la sesión';
      v_footer  := 'Recibes este correo porque eres mentor en XIMA.';
    ELSE
      v_subject := coalesce(c.name, 'The candidate') || ' cannot make the new time';
      v_title   := 'New time declined';
      v_body    := coalesce(c.name, 'The candidate') || ' declined the move: ' || v_when || ' stands. If you cannot make it, propose another time or cancel the session.';
      v_cta     := 'Open the session';
      v_footer  := 'You receive this email because you are a mentor on XIMA.';
    END IF;
  ELSE
    RETURN;
  END IF;

  IF v_to_user IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
    VALUES (v_to_user, v_from_user, v_type, s.id, v_title, v_body);
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

  -- A proposal can be made more than once: key the email on the proposal time.
  IF p_event LIKE 'reschedule_%' THEN
    v_idem := v_idem || '_' || coalesce(to_char(s.reschedule_proposed_at, 'YYYYMMDDHH24MISS'), '');
  END IF;

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

CREATE OR REPLACE FUNCTION public.trg_mentor_session_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'requested' THEN
    PERFORM public.mentor_session_notify(NEW.id, 'requested');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.reschedule_status IS DISTINCT FROM OLD.reschedule_status AND NEW.reschedule_status = 'proposed' THEN
      PERFORM public.mentor_session_notify(NEW.id, 'reschedule_proposed');
    ELSIF NEW.reschedule_status IS DISTINCT FROM OLD.reschedule_status AND NEW.reschedule_status = 'accepted' THEN
      PERFORM public.mentor_session_notify(NEW.id, 'reschedule_accepted');
    ELSIF NEW.reschedule_status IS DISTINCT FROM OLD.reschedule_status AND NEW.reschedule_status = 'rejected' THEN
      PERFORM public.mentor_session_notify(NEW.id, 'reschedule_declined');
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('confirmed', 'rejected') THEN
      PERFORM public.mentor_session_notify(NEW.id, NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_session_notify ON public.mentor_sessions;
CREATE TRIGGER trg_mentor_session_notify
  AFTER INSERT OR UPDATE OF status, reschedule_status ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_mentor_session_notify();
