
-- Fix remaining overly permissive policy on activity_logs

-- Drop the permissive INSERT policy
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

-- Create a properly scoped INSERT policy
-- Note: the log_user_activity function uses SECURITY DEFINER which bypasses RLS,
-- but we still need a fallback for authenticated users
CREATE POLICY "Users can insert their own activity logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
