-- send-transactional-email upserts the unsubscribe token ON CONFLICT (email),
-- but email had only a plain index: every send failed with 42P10 and no
-- transactional email (welcome, invitations) ever left. One token per email.
DELETE FROM public.email_unsubscribe_tokens a
USING public.email_unsubscribe_tokens b
WHERE a.email = b.email AND a.created_at < b.created_at;
DROP INDEX IF EXISTS public.email_unsub_tokens_email_idx;
CREATE UNIQUE INDEX IF NOT EXISTS email_unsubscribe_tokens_email_key
  ON public.email_unsubscribe_tokens (email);
