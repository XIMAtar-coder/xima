
-- 1) email_outbox: remove admin read policy, keep service_role only
DROP POLICY IF EXISTS admin_read_only ON public.email_outbox;

-- 2) email_send_log: add 90-day retention cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_email_send_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.email_send_log
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_email_send_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_email_send_log() TO service_role;

-- Also add same retention helper for email_outbox sent rows
CREATE OR REPLACE FUNCTION public.cleanup_email_outbox()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.email_outbox
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_email_outbox() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_email_outbox() TO service_role;

-- 3) user_consents: replace raw user_agent/ip_address with hashed equivalents
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS user_agent_hash text;
ALTER TABLE public.user_consents ADD COLUMN IF NOT EXISTS ip_address_hash text;

-- Backfill hashes for existing rows
UPDATE public.user_consents
SET user_agent_hash = encode(digest(user_agent, 'sha256'), 'hex')
WHERE user_agent IS NOT NULL AND user_agent_hash IS NULL;

UPDATE public.user_consents
SET ip_address_hash = encode(digest(host(ip_address), 'sha256'), 'hex')
WHERE ip_address IS NOT NULL AND ip_address_hash IS NULL;

-- Drop the plaintext PII columns
ALTER TABLE public.user_consents DROP COLUMN IF EXISTS user_agent;
ALTER TABLE public.user_consents DROP COLUMN IF EXISTS ip_address;
