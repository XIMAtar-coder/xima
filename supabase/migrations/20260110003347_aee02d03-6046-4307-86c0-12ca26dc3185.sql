
-- Remove the overly permissive policies that remain

-- 1. Drop the permissive CV analysis policy (proper one already exists)
DROP POLICY IF EXISTS "Service role can insert CV analysis" ON public.assessment_cv_analysis;

-- 2. Fix mentor_availability_slots - drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Service can update bookings" ON public.mentor_availability_slots;

-- Add proper UPDATE policies for mentor_availability_slots
-- Policy for users who booked slots
CREATE POLICY "Users can update their booked slots" 
ON public.mentor_availability_slots 
FOR UPDATE 
TO authenticated
USING (auth.uid() = booked_by)
WITH CHECK (auth.uid() = booked_by);
