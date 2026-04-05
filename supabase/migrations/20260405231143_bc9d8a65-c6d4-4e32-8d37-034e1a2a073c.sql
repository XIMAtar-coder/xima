
-- Pipeline chat threads
CREATE TABLE IF NOT EXISTS pipeline_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_goal_id UUID NOT NULL,
  shortlist_id UUID REFERENCES shortlist_results(id),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_label TEXT,
  ximatar_archetype TEXT,
  company_name TEXT,
  current_stage TEXT DEFAULT 'shortlisted',
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ,
  unread_business INTEGER DEFAULT 0,
  unread_candidate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hiring_goal_id, candidate_user_id)
);

CREATE INDEX idx_pipeline_chat_threads_business ON pipeline_chat_threads(business_id, is_active);
CREATE INDEX idx_pipeline_chat_threads_candidate ON pipeline_chat_threads(candidate_user_id, is_active);
CREATE INDEX idx_pipeline_chat_threads_goal ON pipeline_chat_threads(hiring_goal_id);

ALTER TABLE pipeline_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business sees own pipeline threads" ON pipeline_chat_threads
  FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Candidate sees own pipeline threads" ON pipeline_chat_threads
  FOR SELECT USING (candidate_user_id = auth.uid());
CREATE POLICY "Participants update own pipeline threads" ON pipeline_chat_threads
  FOR UPDATE USING (business_id = auth.uid() OR candidate_user_id = auth.uid());

-- Pipeline chat messages
CREATE TABLE IF NOT EXISTS pipeline_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES pipeline_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  stage_from TEXT,
  stage_to TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_chat_messages_thread ON pipeline_chat_messages(thread_id, created_at);

ALTER TABLE pipeline_chat_messages ENABLE ROW LEVEL SECURITY;

-- Use security definer to avoid recursion
CREATE OR REPLACE FUNCTION public.is_pipeline_thread_participant(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pipeline_chat_threads
    WHERE id = _thread_id
    AND (business_id = _user_id OR candidate_user_id = _user_id)
  );
$$;

CREATE POLICY "Thread participants read pipeline messages" ON pipeline_chat_messages
  FOR SELECT USING (public.is_pipeline_thread_participant(thread_id, auth.uid()));

CREATE POLICY "Thread participants send pipeline messages" ON pipeline_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.is_pipeline_thread_participant(thread_id, auth.uid())
  );

-- Auto-create chat thread on pipeline stage change
CREATE OR REPLACE FUNCTION auto_create_pipeline_chat_thread()
RETURNS trigger AS $$
DECLARE
  v_thread_id UUID;
  v_company_name TEXT;
BEGIN
  -- Get company name
  SELECT company_name INTO v_company_name
  FROM business_profiles WHERE user_id = NEW.business_id LIMIT 1;

  -- When candidate is first invited to L1
  IF NEW.pipeline_stage = 'l1_invited' AND (OLD.pipeline_stage IS NULL OR OLD.pipeline_stage = 'shortlisted') THEN
    INSERT INTO pipeline_chat_threads (
      hiring_goal_id, shortlist_id, business_id, candidate_user_id,
      anonymous_label, ximatar_archetype, company_name, current_stage
    ) VALUES (
      NEW.hiring_goal_id, NEW.id, NEW.business_id, NEW.candidate_user_id,
      NEW.anonymous_label, NEW.ximatar_archetype, v_company_name, 'l1_invited'
    ) ON CONFLICT (hiring_goal_id, candidate_user_id) DO UPDATE
      SET current_stage = 'l1_invited', updated_at = now()
    RETURNING id INTO v_thread_id;

    INSERT INTO pipeline_chat_messages (thread_id, sender_id, sender_role, message_type, content, stage_from, stage_to)
    VALUES (v_thread_id, NEW.business_id, 'system', 'stage_update', 'Candidate invited to L1 challenge', 'shortlisted', 'l1_invited');
  END IF;

  -- Track subsequent stage changes
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage AND NEW.pipeline_stage NOT IN ('shortlisted', 'l1_invited') THEN
    SELECT id INTO v_thread_id FROM pipeline_chat_threads
    WHERE hiring_goal_id = NEW.hiring_goal_id AND candidate_user_id = NEW.candidate_user_id;

    IF v_thread_id IS NOT NULL THEN
      UPDATE pipeline_chat_threads
      SET current_stage = NEW.pipeline_stage, updated_at = now()
      WHERE id = v_thread_id;

      INSERT INTO pipeline_chat_messages (thread_id, sender_id, sender_role, message_type, content, stage_from, stage_to)
      VALUES (v_thread_id, NEW.business_id, 'system', 'stage_update',
        CASE NEW.pipeline_stage
          WHEN 'l1_completed' THEN 'Candidate completed L1 challenge'
          WHEN 'l1_evaluated' THEN 'L1 challenge evaluated'
          WHEN 'l2_invited' THEN 'Candidate advanced to L2'
          WHEN 'l2_completed' THEN 'Candidate completed L2 challenge'
          WHEN 'l3_invited' THEN 'Candidate advanced to L3'
          WHEN 'l3_completed' THEN 'Candidate completed L3 interview'
          WHEN 'offer_pending' THEN 'Identity revealed — offer stage'
          WHEN 'offered' THEN 'Offer sent to candidate'
          WHEN 'hired' THEN 'Candidate hired!'
          ELSE 'Stage updated to ' || NEW.pipeline_stage
        END,
        OLD.pipeline_stage, NEW.pipeline_stage);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_pipeline_chat ON shortlist_results;
CREATE TRIGGER trg_pipeline_chat
  AFTER UPDATE ON shortlist_results
  FOR EACH ROW EXECUTE FUNCTION auto_create_pipeline_chat_thread();
