ALTER TABLE public.cv_uploads
  ADD COLUMN IF NOT EXISTS analysis_error_message text,
  ADD COLUMN IF NOT EXISTS analysis_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cv_uploads_user_status
  ON public.cv_uploads (user_id, analysis_status, analysis_started_at DESC);