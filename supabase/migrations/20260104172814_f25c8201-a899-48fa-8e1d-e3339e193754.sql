-- Fix log_user_activity to use auth.uid() directly instead of accepting user_id parameter
-- This prevents log spoofing where attackers could create fake activity logs for other users

-- Drop the existing function first (it has 3 parameters)
DROP FUNCTION IF EXISTS public.log_user_activity(uuid, text, jsonb);

-- Create the secure version that uses auth.uid() directly
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_action TEXT,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  calling_user_id UUID;
BEGIN
  -- Get the authenticated user's ID - cannot be spoofed
  calling_user_id := auth.uid();
  
  -- Require authentication
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to log activity';
  END IF;

  INSERT INTO public.activity_logs (user_id, action, context)
  VALUES (calling_user_id, p_action, p_context)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create a separate internal function for trigger use only (needs user_id parameter)
-- This function is NOT callable by clients via RPC
CREATE OR REPLACE FUNCTION public.internal_log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, action, context)
  VALUES (p_user_id, p_action, p_context)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Revoke public access to internal function - only postgres/service role can call it
REVOKE ALL ON FUNCTION public.internal_log_activity(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.internal_log_activity(uuid, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.internal_log_activity(uuid, text, jsonb) FROM authenticated;

-- Update the trigger functions to use internal_log_activity
CREATE OR REPLACE FUNCTION public.log_job_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'applied' AND (OLD.status IS NULL OR OLD.status != 'applied') THEN
    PERFORM public.internal_log_activity(
      NEW.user_id,
      'job_application',
      jsonb_build_object('job_id', NEW.job_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_challenge_participation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.internal_log_activity(
    NEW.candidate_id,
    'challenge_joined',
    jsonb_build_object('challenge_id', NEW.challenge_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;