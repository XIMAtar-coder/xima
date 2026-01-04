-- Fix: Require authentication to view mentors (PUBLIC_DATA_EXPOSURE)
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Everyone can view active mentors" ON mentors;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view active mentors"
ON mentors
FOR SELECT
USING (
  is_active = true AND 
  auth.uid() IS NOT NULL
);