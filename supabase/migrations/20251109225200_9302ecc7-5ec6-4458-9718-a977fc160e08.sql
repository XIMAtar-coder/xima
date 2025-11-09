-- Add RLS policy for admins to view all user_job_links (needed for analytics)
CREATE POLICY "Admins can view all user_job_links"
ON public.user_job_links
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create a function to assign the first admin role
-- This function can only be used if no admin exists yet
CREATE OR REPLACE FUNCTION public.assign_first_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- Only allow if no admin exists yet
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'An admin already exists. Only existing admins can assign new admins.';
  END IF;
  
  -- Assign admin role to the target user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create a function that admins can use to assign roles to other users
CREATE OR REPLACE FUNCTION public.assign_role_to_user(target_user_id uuid, target_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can assign roles
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Assign the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;