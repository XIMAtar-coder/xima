
-- =====================================================
-- STEP 1: AI Invocation Envelope — Governance Table
-- =====================================================

-- Table to persist metadata for every AI/LLM call
CREATE TABLE public.ai_invocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  function_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'lovable_gateway',
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT '1.0',
  temperature NUMERIC(3,2),
  prompt_hash TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','error','rate_limited','payment_required')),
  error_code TEXT,
  latency_ms INTEGER,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin queries by function, status, time
CREATE INDEX idx_ai_invocation_log_function ON public.ai_invocation_log (function_name, invoked_at DESC);
CREATE INDEX idx_ai_invocation_log_correlation ON public.ai_invocation_log (correlation_id);
CREATE INDEX idx_ai_invocation_log_status ON public.ai_invocation_log (status) WHERE status != 'success';

-- RLS: service-role only writes; admin reads via edge function
ALTER TABLE public.ai_invocation_log ENABLE ROW LEVEL SECURITY;

-- No public RLS policies — only service_role can read/write
-- Admin access is via the edge function with has_role check

COMMENT ON TABLE public.ai_invocation_log IS 'Enterprise audit trail for all AI/LLM invocations. No raw prompts or PII stored — only hashes and redacted summaries.';
COMMENT ON COLUMN public.ai_invocation_log.prompt_hash IS 'SHA-256 hash of the full prompt (system+user). Used for drift detection without storing content.';
COMMENT ON COLUMN public.ai_invocation_log.input_summary IS 'Redacted summary of input (e.g. "open_answer:field=science_tech,lang=en,len=342"). No PII.';
COMMENT ON COLUMN public.ai_invocation_log.output_summary IS 'Redacted summary of output (e.g. "score=72,quality=good,flags=0"). No PII.';
