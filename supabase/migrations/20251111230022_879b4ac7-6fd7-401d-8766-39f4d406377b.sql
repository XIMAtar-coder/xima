-- Create activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  context JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (true);

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add sentiment column to assessment_results
ALTER TABLE public.assessment_results 
ADD COLUMN IF NOT EXISTS sentiment FLOAT CHECK (sentiment >= -1 AND sentiment <= 1);

-- Function to log activity
CREATE OR REPLACE FUNCTION log_user_activity(
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

-- Trigger to log job applications
CREATE OR REPLACE FUNCTION log_job_application()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'applied' AND (OLD.status IS NULL OR OLD.status != 'applied') THEN
    PERFORM log_user_activity(
      NEW.user_id,
      'job_application',
      jsonb_build_object('job_id', NEW.job_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_job_application ON public.user_job_links;
CREATE TRIGGER on_job_application
AFTER INSERT OR UPDATE ON public.user_job_links
FOR EACH ROW EXECUTE FUNCTION log_job_application();

-- Trigger to log challenge participation
CREATE OR REPLACE FUNCTION log_challenge_participation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_user_activity(
    NEW.candidate_id,
    'challenge_joined',
    jsonb_build_object('challenge_id', NEW.challenge_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_challenge_joined ON public.candidate_challenges;
CREATE TRIGGER on_challenge_joined
AFTER INSERT ON public.candidate_challenges
FOR EACH ROW EXECUTE FUNCTION log_challenge_participation();