-- Add DNA cadence tracking to business_profiles
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS dna_locked_until TIMESTAMPTZ;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS dna_last_regenerated_at TIMESTAMPTZ;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS strategic_focus JSONB;

-- Create DNA history table
CREATE TABLE IF NOT EXISTS public.company_dna_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  pillar_scores JSONB NOT NULL,
  best_fit_ximatars JSONB,
  regeneration_reason TEXT,
  triggered_by_user UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dna_history_business ON company_dna_history(business_id, created_at DESC);

ALTER TABLE public.company_dna_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business users can view own DNA history"
  ON public.company_dna_history FOR SELECT
  USING (business_id = auth.uid());

CREATE POLICY "Business users can insert own DNA history"
  ON public.company_dna_history FOR INSERT
  WITH CHECK (business_id = auth.uid());