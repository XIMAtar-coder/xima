
-- Step 2.1: Add unique constraint on ai_invocation_log.request_id, then harden evidence ledger FKs

-- 0. Unique constraint needed for FK target
ALTER TABLE public.ai_invocation_log
  ADD CONSTRAINT ai_invocation_log_request_id_unique UNIQUE (request_id);

-- 1. FK: ai_request_id → ai_invocation_log.request_id (RESTRICT — audit immutability)
ALTER TABLE public.assessment_evidence_ledger
  ADD CONSTRAINT assessment_evidence_ledger_ai_request_id_fkey
  FOREIGN KEY (ai_request_id) REFERENCES public.ai_invocation_log(request_id)
  ON DELETE RESTRICT;

-- 2. FK: subject_profile_id → profiles.id (SET NULL — GDPR deletion nullifies PII link)
ALTER TABLE public.assessment_evidence_ledger
  ADD CONSTRAINT assessment_evidence_ledger_subject_profile_id_fkey
  FOREIGN KEY (subject_profile_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Make subject_profile_id nullable for GDPR SET NULL
ALTER TABLE public.assessment_evidence_ledger
  ALTER COLUMN subject_profile_id DROP NOT NULL;

-- 3. Update open_response_id FK to SET NULL (GDPR: preserve evidence, remove link)
ALTER TABLE public.assessment_evidence_ledger
  DROP CONSTRAINT IF EXISTS assessment_evidence_ledger_open_response_id_fkey;

ALTER TABLE public.assessment_evidence_ledger
  ADD CONSTRAINT assessment_evidence_ledger_open_response_id_fkey
  FOREIGN KEY (open_response_id) REFERENCES public.assessment_open_responses(id)
  ON DELETE SET NULL;

ALTER TABLE public.assessment_evidence_ledger
  ALTER COLUMN open_response_id DROP NOT NULL;

-- 4. Document GDPR deletion behavior
COMMENT ON TABLE public.assessment_evidence_ledger IS
  'Audit trail for open-answer AI evaluations. GDPR deletion: subject_profile_id and open_response_id are SET NULL on account deletion. Remaining fields (content_hash, scores, quality_label, ai_request_id) contain NO PII. Re-identification impossible after nullification — content_hash is one-way SHA-256, no raw text stored.';
