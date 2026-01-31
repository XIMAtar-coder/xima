-- Add first_session_expectations field to mentors table
ALTER TABLE public.mentors 
ADD COLUMN IF NOT EXISTS first_session_expectations TEXT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.mentors.first_session_expectations IS 'Mentor description of what candidates should expect from the first session';

-- Add RLS policy for mentors to update their own record
DROP POLICY IF EXISTS "Mentors can update own record" ON public.mentors;
CREATE POLICY "Mentors can update own record" 
ON public.mentors
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add RLS policy for mentors to select their own record
DROP POLICY IF EXISTS "Mentors can select own record" ON public.mentors;
CREATE POLICY "Mentors can select own record" 
ON public.mentors
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);