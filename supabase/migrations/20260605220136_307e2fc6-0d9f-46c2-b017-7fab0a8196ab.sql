
-- =====================================================================
-- Transactional email infra (service-role only)
-- Bridges new send-transactional-email function -> existing email_outbox
-- =====================================================================

-- 1) suppressed_emails: bounce/complaint/unsubscribe list
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  email       text PRIMARY KEY,
  reason      text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.suppressed_emails FROM anon, authenticated;
GRANT ALL ON public.suppressed_emails TO service_role;

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppressed_emails_service_only" ON public.suppressed_emails;
CREATE POLICY "suppressed_emails_service_only"
  ON public.suppressed_emails
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2) email_unsubscribe_tokens: one-click unsubscribe tokens
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  token       text PRIMARY KEY,
  email       text NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_unsub_tokens_email_idx
  ON public.email_unsubscribe_tokens (email);

REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_unsub_tokens_service_only" ON public.email_unsubscribe_tokens;
CREATE POLICY "email_unsub_tokens_service_only"
  ON public.email_unsubscribe_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3) email_send_log: append-only send history
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      text,
  template_name   text,
  recipient_email text,
  status          text NOT NULL,
  error_message   text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_recipient_idx
  ON public.email_send_log (recipient_email, created_at DESC);
CREATE INDEX IF NOT EXISTS email_send_log_message_idx
  ON public.email_send_log (message_id);

REVOKE ALL ON public.email_send_log FROM anon, authenticated;
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_send_log_service_only" ON public.email_send_log;
CREATE POLICY "email_send_log_service_only"
  ON public.email_send_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4) enqueue_email RPC — bridge to the existing email_outbox table
-- send-transactional-email calls supabase.rpc('enqueue_email', {queue_name, payload}).
-- We insert a row into email_outbox so process-email-outbox can deliver it.
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient text := payload->>'to';
  v_subject   text := payload->>'subject';
  v_html      text := payload->>'html';
  v_label     text := COALESCE(payload->>'label', 'transactional');
  v_idem      text := COALESCE(payload->>'idempotency_key', payload->>'message_id', gen_random_uuid()::text);
  v_id        bigint;
BEGIN
  IF v_recipient IS NULL OR v_subject IS NULL OR v_html IS NULL THEN
    RAISE EXCEPTION 'enqueue_email: missing required payload fields (to, subject, html)';
  END IF;

  INSERT INTO public.email_outbox (
    idempotency_key, email_type, recipient_email, subject, html_body, metadata, status
  )
  VALUES (
    v_idem, v_label, v_recipient, v_subject, v_html, payload, 'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- Always return a numeric handle (1 on insert, 0 on conflict)
  GET DIAGNOSTICS v_id = ROW_COUNT;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

-- Ensure email_outbox has a unique index on idempotency_key for the ON CONFLICT above
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_idempotency_key_unique
  ON public.email_outbox (idempotency_key);
