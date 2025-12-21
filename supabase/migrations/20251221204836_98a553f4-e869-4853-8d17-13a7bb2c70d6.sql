-- Add XIMA signals columns to challenge_submissions
ALTER TABLE public.challenge_submissions 
ADD COLUMN IF NOT EXISTS signals_payload jsonb NULL,
ADD COLUMN IF NOT EXISTS signals_version text NOT NULL DEFAULT 'v1';