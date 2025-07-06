-- Fix security issues in PostgreSQL functions and auth configuration

-- 1. Fix mutable search path in update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search path to empty to ensure only fully qualified names are used
    SET search_path = '';
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix mutable search path in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search path to empty to prevent function hijacking
    SET search_path = '';
    
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update auth configuration for better security
-- Set OTP expiry to 1 hour (3600 seconds) if currently longer
UPDATE auth.config 
SET email_template_forgot_password_life_seconds = 3600 
WHERE email_template_forgot_password_life_seconds > 3600;

-- 4. Enable leaked password protection (HIBP check)
UPDATE auth.config 
SET enable_hibp_check = true 
WHERE enable_hibp_check IS NULL OR enable_hibp_check = false;