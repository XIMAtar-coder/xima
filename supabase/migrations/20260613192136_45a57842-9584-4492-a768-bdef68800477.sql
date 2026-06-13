ALTER TABLE public.user_consents DROP CONSTRAINT IF EXISTS user_consents_consent_type_check;
ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_consent_type_check
  CHECK (consent_type = ANY (ARRAY['privacy'::text, 'terms'::text, 'cv_processing'::text]));

REVOKE EXECUTE ON FUNCTION public.cleanup_guest_rate_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_guest_rate_limit() TO service_role;