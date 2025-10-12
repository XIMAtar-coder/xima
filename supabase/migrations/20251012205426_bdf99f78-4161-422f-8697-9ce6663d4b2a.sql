-- Create table to store per-attempt open answers & scores
CREATE TABLE IF NOT EXISTS public.assessment_open_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL,
  field_key TEXT NOT NULL CHECK (field_key IN ('science_tech','business_leadership','arts_creative','service_ops')),
  language TEXT NOT NULL DEFAULT 'it',
  open_key TEXT NOT NULL CHECK (open_key IN ('open1','open2')),
  answer TEXT NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  rubric JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by user and attempt
CREATE INDEX IF NOT EXISTS idx_open_responses_user_attempt 
ON public.assessment_open_responses(user_id, attempt_id);

-- Enable RLS
ALTER TABLE public.assessment_open_responses ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own responses
CREATE POLICY "Users can view their own open responses"
ON public.assessment_open_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: users can insert their own responses
CREATE POLICY "Users can insert their own open responses"
ON public.assessment_open_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);