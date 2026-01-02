-- Fix 1: Add search_path to update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix 2: Add authentication check to log_user_activity
-- This ensures users can only log activity for themselves (unless admin)
CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_action text, p_context jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  log_id UUID;
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Security check: Only allow logging for self, or if caller is admin
  -- Also allow if called from a trigger context (calling_user_id will be NULL for internal triggers)
  IF calling_user_id IS NOT NULL 
     AND calling_user_id != p_user_id 
     AND NOT public.has_role(calling_user_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Cannot log activity for other users';
  END IF;

  INSERT INTO public.activity_logs (user_id, action, context)
  VALUES (p_user_id, p_action, p_context)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;