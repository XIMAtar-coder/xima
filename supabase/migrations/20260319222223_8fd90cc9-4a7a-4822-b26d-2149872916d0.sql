-- Fix privilege escalation: restrict user_roles INSERT to only allow 'user' role
-- Admin/operator roles must be assigned via assign_role_to_user() function

DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can insert their own user role only"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'user'::app_role);