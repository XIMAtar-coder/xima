
-- Step 1 Hardening: Add governance version fields to ai_invocation_log
ALTER TABLE public.ai_invocation_log
  ADD COLUMN IF NOT EXISTS prompt_template_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS scoring_schema_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS max_tokens integer;

-- Add comment for governance clarity
COMMENT ON COLUMN public.ai_invocation_log.prompt_hash IS 'SHA-256 of concatenated: system_prompt + user_prompt + temperature + max_tokens + hidden_instructions';
COMMENT ON COLUMN public.ai_invocation_log.prompt_template_version IS 'Version of the prompt template used (e.g. 1.0, 1.1)';
COMMENT ON COLUMN public.ai_invocation_log.scoring_schema_version IS 'Version of the scoring/validation schema (e.g. aiSchema.ts version)';
COMMENT ON COLUMN public.ai_invocation_log.max_tokens IS 'max_tokens param sent to AI gateway (null = provider default)';
