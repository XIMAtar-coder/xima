
-- Add anonymous display fields to shortlist_results
ALTER TABLE shortlist_results ADD COLUMN IF NOT EXISTS anonymous_label TEXT;
ALTER TABLE shortlist_results ADD COLUMN IF NOT EXISTS identity_revealed BOOLEAN DEFAULT false;
ALTER TABLE shortlist_results ADD COLUMN IF NOT EXISTS identity_revealed_at TIMESTAMPTZ;
ALTER TABLE shortlist_results ADD COLUMN IF NOT EXISTS identity_revealed_by UUID;
ALTER TABLE shortlist_results ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'shortlisted';

-- Add anonymous label to challenge invitations
ALTER TABLE challenge_invitations ADD COLUMN IF NOT EXISTS anonymous_label TEXT;

-- Hire/offer table
CREATE TABLE IF NOT EXISTS hiring_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id UUID NOT NULL REFERENCES shortlist_results(id),
  hiring_goal_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES auth.users(id),
  offer_status TEXT DEFAULT 'draft',
  offer_message TEXT,
  offer_salary TEXT,
  offer_start_date DATE,
  offer_notes TEXT,
  identity_revealed_at TIMESTAMPTZ DEFAULT now(),
  candidate_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_business ON hiring_offers(business_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON hiring_offers(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_offers_goal ON hiring_offers(hiring_goal_id);

ALTER TABLE hiring_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business sees own offers" ON hiring_offers FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Candidate sees own offers" ON hiring_offers FOR SELECT USING (candidate_user_id = auth.uid());
CREATE POLICY "Service manages offers" ON hiring_offers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-assign anonymous labels trigger
CREATE OR REPLACE FUNCTION assign_anonymous_label()
RETURNS trigger AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.anonymous_label IS NULL THEN
    SELECT COALESCE(MAX(
      CASE WHEN anonymous_label ~ '^\d+$' THEN anonymous_label::integer ELSE 0 END
    ), 0) + 1
    INTO next_num
    FROM shortlist_results
    WHERE hiring_goal_id = NEW.hiring_goal_id;
    
    NEW.anonymous_label := next_num::TEXT;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  NEW.anonymous_label := substr(NEW.candidate_user_id::text, 1, 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_anonymous_label ON shortlist_results;
CREATE TRIGGER trg_anonymous_label
  BEFORE INSERT ON shortlist_results
  FOR EACH ROW EXECUTE FUNCTION assign_anonymous_label();
