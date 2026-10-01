-- An account signed in with Google has an address Google already verified,
-- yet handle_new_user gave it the same 24-hour deadline as an email signup,
-- so the "verification expired" banner blocked candidates who had nothing
-- to verify. auth.users.email_confirmed_at is no substitute: Supabase sets
-- it at signup for email accounts too (Rolando, 29/09: confirmed at signup,
-- never clicked a link). The Google identity row is the reliable signal,
-- whether it arrives at signup or when an email account links Google later.
CREATE OR REPLACE FUNCTION public.handle_google_identity_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.provider = 'google' THEN
    UPDATE public.profiles
       SET email_verified_at = COALESCE(email_verified_at, now()),
           account_status = CASE WHEN account_status = 'suspended' THEN account_status ELSE 'active' END
     WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_google_identity_verified ON auth.identities;
CREATE TRIGGER on_google_identity_verified
  AFTER INSERT ON auth.identities
  FOR EACH ROW EXECUTE FUNCTION public.handle_google_identity_verified();

-- Anyone who already has a Google identity is verified.
UPDATE public.profiles p
   SET email_verified_at = COALESCE(p.email_verified_at, now()),
       account_status = CASE WHEN p.account_status = 'suspended' THEN p.account_status ELSE 'active' END
  FROM auth.identities i
 WHERE i.user_id = p.user_id AND i.provider = 'google' AND p.email_verified_at IS NULL;
