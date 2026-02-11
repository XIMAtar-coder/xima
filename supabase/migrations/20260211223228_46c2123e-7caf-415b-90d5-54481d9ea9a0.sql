-- Disable the welcome email trigger that uses pg_net (not available in Lovable Cloud)
-- This trigger crashes the entire signup transaction with "schema net does not exist"
DROP TRIGGER IF EXISTS trg_send_welcome_email ON public.profiles;
