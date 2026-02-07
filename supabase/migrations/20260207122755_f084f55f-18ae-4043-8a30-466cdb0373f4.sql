
-- Backfill referral_code for all existing profiles that don't have one
UPDATE public.profiles
SET referral_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
WHERE referral_code IS NULL;

-- Create trigger function to auto-generate referral_code on insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();
