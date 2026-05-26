CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.email_verification_tokens TO authenticated;
GRANT ALL ON public.email_verification_tokens TO service_role;

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens (debug only); writes are service_role-only via edge fns
CREATE POLICY "Users view own verification tokens"
ON public.email_verification_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_verif_tokens_user ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_tokens_expires ON public.email_verification_tokens(expires_at);