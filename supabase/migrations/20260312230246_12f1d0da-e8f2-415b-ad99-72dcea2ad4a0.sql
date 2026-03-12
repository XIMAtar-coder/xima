-- Tighten activity_logs INSERT policy for defense-in-depth
-- Replace the overly permissive "WITH CHECK (true)" policy with one that validates user_id
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

CREATE POLICY "Users can log own activity"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());