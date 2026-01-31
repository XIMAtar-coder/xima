-- Add email column to mentors table (hidden from candidates)
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Drop and recreate mentors_public view to ensure email is NOT exposed
DROP VIEW IF EXISTS public.mentors_public;

CREATE VIEW public.mentors_public AS
SELECT 
  id,
  name,
  title,
  bio,
  profile_image_url,
  linkedin_url,
  specialties,
  xima_pillars,
  rating,
  is_active,
  first_session_expectations,
  updated_at
FROM public.mentors
WHERE is_active = true;

-- Grant select on view to authenticated users (no email exposed)
GRANT SELECT ON public.mentors_public TO authenticated;

-- Update RLS: Mentors can see their own email, but not others'
-- First, drop existing select policy if any
DROP POLICY IF EXISTS "Mentors can view own record" ON public.mentors;
DROP POLICY IF EXISTS "Mentors can select own record" ON public.mentors;

-- Create new select policy: mentors can only see their own record
CREATE POLICY "Mentors can select own record" 
ON public.mentors 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Update Daniel Cracau's mentor record with email
UPDATE public.mentors 
SET email = 'daniel.cracau@gmail.com'
WHERE name = 'Daniel Cracau';