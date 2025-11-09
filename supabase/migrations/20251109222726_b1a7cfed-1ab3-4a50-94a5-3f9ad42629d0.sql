-- Fix the trigger function with proper search_path
CREATE OR REPLACE FUNCTION public.update_user_job_links_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;