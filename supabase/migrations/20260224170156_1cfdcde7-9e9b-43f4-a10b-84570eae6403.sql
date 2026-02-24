
-- Step 3: Email Outbox + Idempotency

-- 1. Email outbox table
CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_attempt_at timestamptz,
  next_retry_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_outbox_idempotency_unique UNIQUE (idempotency_key)
);

-- 2. RLS: service_role writes, admin reads
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.email_outbox
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_read_only" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 3. Index for worker polling
CREATE INDEX idx_email_outbox_pending ON public.email_outbox (next_retry_at)
  WHERE status IN ('pending', 'failed') AND attempts < max_attempts;

-- 4. Updated_at trigger
CREATE TRIGGER trg_email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Helper: enqueue email (used by other functions)
CREATE OR REPLACE FUNCTION public.enqueue_email(
  p_idempotency_key text,
  p_email_type text,
  p_recipient_email text,
  p_subject text,
  p_html_body text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.email_outbox (idempotency_key, email_type, recipient_email, subject, html_body, metadata)
  VALUES (p_idempotency_key, p_email_type, p_recipient_email, p_subject, p_html_body, p_metadata)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  
  -- If already existed, return existing id
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.email_outbox WHERE idempotency_key = p_idempotency_key;
  END IF;
  
  RETURN v_id;
END;
$$;

COMMENT ON TABLE public.email_outbox IS
  'Transactional email outbox. Emails are enqueued here and processed by the process-email-outbox worker with exponential backoff. Idempotency enforced by unique idempotency_key.';
