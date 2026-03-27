CREATE TABLE IF NOT EXISTS public.user_ai_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_extracted_text TEXT,
  cv_extraction_method TEXT,
  cv_language TEXT,
  cv_credentials_summary JSONB,
  cv_identity_summary JSONB,
  cv_analyzed_at TIMESTAMPTZ,
  cv_file_hash TEXT,
  assessment_summary JSONB,
  assessment_updated_at TIMESTAMPTZ,
  challenge_history_summary JSONB,
  challenges_updated_at TIMESTAMPTZ,
  growth_summary JSONB,
  growth_updated_at TIMESTAMPTZ,
  matching_preferences JSONB,
  matching_updated_at TIMESTAMPTZ,
  l3_summary JSONB,
  l3_updated_at TIMESTAMPTZ,
  total_ai_calls INTEGER DEFAULT 0,
  total_tokens_saved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_ai_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context" ON public.user_ai_context
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages context" ON public.user_ai_context
  FOR ALL USING (true) WITH CHECK (true);