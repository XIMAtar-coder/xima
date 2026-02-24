
-- STEP 2: Assessment Evidence Ledger (fixed — no generated column)

CREATE TABLE public.assessment_evidence_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  open_response_id uuid NOT NULL REFERENCES public.assessment_open_responses(id) ON DELETE SET NULL,
  subject_profile_id uuid NOT NULL,
  attempt_id text NOT NULL,
  field_key text NOT NULL,
  open_key text NOT NULL,
  ai_request_id text NOT NULL,
  rubric_version text NOT NULL DEFAULT '1.0',
  scoring_schema_version text NOT NULL DEFAULT '1.0',
  prompt_template_version text NOT NULL DEFAULT '1.0',
  final_score integer NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  quality_label text NOT NULL CHECK (quality_label IN ('insufficient','poor','fair','good','excellent')),
  key_reasons text[] NOT NULL DEFAULT '{}',
  detected_red_flags text[] NOT NULL DEFAULT '{}',
  score_breakdown jsonb,
  content_hash text NOT NULL,
  content_length integer NOT NULL,
  content_language text NOT NULL DEFAULT 'en',
  retention_days integer NOT NULL DEFAULT 730,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-compute expires_at
CREATE OR REPLACE FUNCTION public.set_evidence_ledger_expires_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  NEW.expires_at := NEW.created_at + (NEW.retention_days || ' days')::interval;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evidence_ledger_expires
  BEFORE INSERT OR UPDATE OF retention_days ON public.assessment_evidence_ledger
  FOR EACH ROW EXECUTE FUNCTION public.set_evidence_ledger_expires_at();

CREATE INDEX idx_evidence_ledger_subject ON public.assessment_evidence_ledger(subject_profile_id);
CREATE INDEX idx_evidence_ledger_attempt ON public.assessment_evidence_ledger(attempt_id);
CREATE INDEX idx_evidence_ledger_ai_request ON public.assessment_evidence_ledger(ai_request_id);
CREATE INDEX idx_evidence_ledger_expires ON public.assessment_evidence_ledger(expires_at);

ALTER TABLE public.assessment_evidence_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_evidence_ledger"
  ON public.assessment_evidence_ledger
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.assessment_evidence_ledger IS 'Enterprise audit trail for open-answer AI evaluations. No raw text — only content_hash.';
COMMENT ON COLUMN public.assessment_evidence_ledger.ai_request_id IS 'Links to ai_invocation_log.request_id for full audit chain';
