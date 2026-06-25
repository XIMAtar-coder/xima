ALTER TABLE public.cv_uploads
  ADD COLUMN IF NOT EXISTS analysis_worker_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cv_uploads_processing_worker
ON public.cv_uploads (created_at)
WHERE analysis_status = 'processing'
  AND analysis_completed_at IS NULL
  AND analysis_attempts < 3;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_cv_analysis_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  project_url text := 'https://iyckvvnecpnldrxqmzta.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Y2t2dm5lY3BubGRyeHFtenRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMwNjUsImV4cCI6MjA2NzA2OTA2NX0.OJJ4iid8HbUCmUUkaMVObJOG1y4_t1ia1QTpDhKYlqQ';
BEGIN
  IF NEW.analysis_status = 'processing' THEN
    PERFORM extensions.net.http_post(
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

DROP TRIGGER IF EXISTS trg_dispatch_cv_analysis_worker ON public.cv_uploads;
CREATE TRIGGER trg_dispatch_cv_analysis_worker
  AFTER INSERT ON public.cv_uploads
  FOR EACH ROW
  WHEN (NEW.analysis_status = 'processing')
  EXECUTE FUNCTION public.dispatch_cv_analysis_worker();