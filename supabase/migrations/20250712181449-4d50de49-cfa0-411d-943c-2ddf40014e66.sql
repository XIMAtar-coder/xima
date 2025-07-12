-- Disable email confirmation requirement for development
UPDATE auth.config 
SET raw_app_meta_data = jsonb_set(
  raw_app_meta_data, 
  '{DISABLE_SIGNUP_EMAIL_CONFIRMATION}', 
  'true'
) 
WHERE id = 'global';