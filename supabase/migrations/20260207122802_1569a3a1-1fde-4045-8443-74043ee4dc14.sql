
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;
