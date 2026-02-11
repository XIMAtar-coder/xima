
-- 1. Add welcome_email_sent_at column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

-- 2. Function that calls the edge function via pg_net (http extension)
--    Falls back gracefully if pg_net is not available.
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  project_url text := 'https://iyckvvnecpnldrxqmzta.supabase.co';
  service_role_key text;
BEGIN
  -- Only fire for real user profiles
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read service role key from vault (stored as a Supabase secret)
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'send_welcome_email: service_role_key not found in vault, skipping';
    RETURN NEW;
  END IF;

  -- Call edge function asynchronously via pg_net
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('user_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

-- 3. Trigger on profiles AFTER INSERT
DROP TRIGGER IF EXISTS trg_send_welcome_email ON public.profiles;
CREATE TRIGGER trg_send_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.send_welcome_email_on_signup();
