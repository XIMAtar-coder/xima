CREATE OR REPLACE FUNCTION public.dispatch_cv_analysis_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_catalog
AS $$
DECLARE
  project_url text := 'https://iyckvvnecpnldrxqmzta.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Y2t2dm5lY3BubGRyeHFtenRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMwNjUsImV4cCI6MjA2NzA2OTA2NX0.OJJ4iid8HbUCmUUkaMVObJOG1y4_t1ia1QTpDhKYlqQ';
BEGIN
  IF NEW.analysis_status = 'processing' THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/analyze-cv',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', anon_key,
        'Authorization', 'Bearer ' || anon_key,
        'x-cv-worker', 'process_pending',
        'x-correlation-id', 'cv-worker-' || NEW.id::text
      ),
      body := jsonb_build_object(
        'mode', 'process_pending',
        'job_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispatch_cv_analysis_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dispatch_cv_analysis_worker() FROM anon;
REVOKE EXECUTE ON FUNCTION public.dispatch_cv_analysis_worker() FROM authenticated;