
-- Add first_name, last_name, email verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_required_until timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending_verification';

-- Backfill existing users: split name into first/last, set verified status based on auth.users
UPDATE public.profiles p
SET
  first_name = COALESCE(
    NULLIF(split_part(COALESCE(p.full_name, p.name, ''), ' ', 1), ''),
    p.name
  ),
  last_name = NULLIF(
    trim(substring(COALESCE(p.full_name, p.name, '') from position(' ' in COALESCE(p.full_name, p.name, '')) + 1)),
    ''
  ),
  email_verified_at = CASE
    WHEN au.email_confirmed_at IS NOT NULL THEN COALESCE(au.email_confirmed_at, now())
    ELSE NULL
  END,
  account_status = CASE
    WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
    WHEN p.created_at + interval '24 hours' < now() THEN 'suspended'
    ELSE 'pending_verification'
  END,
  verification_required_until = p.created_at + interval '24 hours'
FROM auth.users au
WHERE au.id = p.user_id;

-- Update trigger to populate first_name, last_name, and verification fields on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, name, first_name, last_name, full_name,
    profile_complete, account_status, verification_required_until
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'first_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'name', ''), ' ', 1)),
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(
      NULLIF(
        trim(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')),
        ''
      ),
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    false,
    'pending_verification',
    now() + interval '24 hours'
  );
  RETURN NEW;
END;
$$;

-- Create is_email_verified() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
  _verified_at timestamptz;
  _email_confirmed_at timestamptz;
BEGIN
  -- Check auth.users email_confirmed_at
  SELECT email_confirmed_at INTO _email_confirmed_at
  FROM auth.users WHERE id = auth.uid();

  IF _email_confirmed_at IS NULL THEN
    RETURN false;
  END IF;

  -- Check profile status
  SELECT account_status, email_verified_at INTO _status, _verified_at
  FROM public.profiles WHERE user_id = auth.uid();

  IF _status = 'suspended' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated;

-- Create a function to auto-activate profile when email is confirmed
-- This is called by a trigger on auth.users (cannot attach triggers to auth schema)
-- Instead, we'll use an RPC that the AuthCallback can call
CREATE OR REPLACE FUNCTION public.confirm_email_verification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _confirmed_at timestamptz;
BEGIN
  SELECT email_confirmed_at INTO _confirmed_at
  FROM auth.users WHERE id = auth.uid();

  IF _confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET
      email_verified_at = COALESCE(email_verified_at, _confirmed_at),
      account_status = 'active'
    WHERE user_id = auth.uid()
      AND account_status != 'suspended';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_email_verification() TO authenticated;

-- Create a function to check and suspend expired unverified accounts
-- Called at read-time or can be scheduled
CREATE OR REPLACE FUNCTION public.check_verification_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET account_status = 'suspended'
  WHERE account_status = 'pending_verification'
    AND verification_required_until < now()
    AND email_verified_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_verification_expiry() TO authenticated;
