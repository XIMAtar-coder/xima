-- ============================================================
-- ENFORCED PROGRESSIVE PIPELINE + TRANSPARENT NOTIFICATIONS
-- ============================================================

-- 1. Update challenge_reviews decision constraint to include proceed_level2 and proceed_level3
ALTER TABLE public.challenge_reviews 
DROP CONSTRAINT IF EXISTS challenge_reviews_decision_check;

ALTER TABLE public.challenge_reviews 
ADD CONSTRAINT challenge_reviews_decision_check 
CHECK (decision IN ('shortlist', 'followup', 'pass', 'proceed_level2', 'proceed_level3'));

-- 2. Create pipeline guard function
CREATE OR REPLACE FUNCTION public.enforce_pipeline_progression()
RETURNS TRIGGER AS $$
DECLARE
  challenge_rubric JSONB;
  challenge_level INT;
  l1_submitted BOOLEAN;
  l1_reviewed_proceed BOOLEAN;
BEGIN
  -- Get the challenge's rubric to determine level
  SELECT rubric INTO challenge_rubric 
  FROM public.business_challenges 
  WHERE id = NEW.challenge_id;
  
  -- Determine level from rubric.type
  IF challenge_rubric->>'type' = 'xima_core' THEN
    challenge_level := 1;
  ELSIF challenge_rubric->>'type' IN ('standing_presence', 'video') THEN
    challenge_level := 3;
  ELSE
    challenge_level := 2; -- default: role-specific
  END IF;
  
  -- Level 1: always allowed
  IF challenge_level = 1 THEN
    RETURN NEW;
  END IF;
  
  -- Level 2: Require L1 submitted + proceed_level2 review
  IF challenge_level = 2 THEN
    -- Check for L1 submission with status='submitted'
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_submissions cs
      JOIN public.challenge_invitations ci ON ci.id = cs.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (bc.rubric->>'type' = 'xima_core')
        AND cs.status = 'submitted'
    ) INTO l1_submitted;
    
    IF NOT l1_submitted THEN
      RAISE EXCEPTION 'pipeline_locked: Level 1 (XIMA Core) submission required before Level 2';
    END IF;
    
    -- Check for proceed_level2 review decision
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_reviews cr
      JOIN public.challenge_invitations ci ON ci.id = cr.invitation_id
      JOIN public.business_challenges bc ON bc.id = ci.challenge_id
      WHERE ci.candidate_profile_id = NEW.candidate_profile_id
        AND ci.business_id = NEW.business_id
        AND ci.hiring_goal_id = NEW.hiring_goal_id
        AND (bc.rubric->>'type' = 'xima_core')
        AND cr.decision = 'proceed_level2'
    ) INTO l1_reviewed_proceed;
    
    IF NOT l1_reviewed_proceed THEN
      RAISE EXCEPTION 'pipeline_locked: Business must first select "Proceed to Level 2" for this candidate';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Level 3: Require L2 submitted + proceed_level3 review (future)
  IF challenge_level = 3 THEN
    -- For now, just allow Level 3 (can be extended later)
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger for pipeline enforcement
DROP TRIGGER IF EXISTS enforce_pipeline_on_invite ON public.challenge_invitations;
CREATE TRIGGER enforce_pipeline_on_invite
  BEFORE INSERT ON public.challenge_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pipeline_progression();

-- 4. Create notification function for challenge submissions
CREATE OR REPLACE FUNCTION public.notify_challenge_submission()
RETURNS TRIGGER AS $$
DECLARE
  candidate_user_id UUID;
  challenge_title TEXT;
  company_name TEXT;
BEGIN
  -- Only trigger when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Get candidate auth user_id
    SELECT p.user_id INTO candidate_user_id
    FROM public.profiles p
    WHERE p.id = NEW.candidate_profile_id;
    
    -- Get challenge title
    SELECT bc.title INTO challenge_title
    FROM public.business_challenges bc
    WHERE bc.id = NEW.challenge_id;
    
    -- Get company name
    SELECT bp.company_name INTO company_name
    FROM public.business_profiles bp
    WHERE bp.user_id = NEW.business_id;
    
    IF candidate_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
      VALUES (
        candidate_user_id,
        NEW.business_id,
        'submission_received',
        NEW.invitation_id,
        'Submission Received',
        'Your response to "' || COALESCE(challenge_title, 'Challenge') || '" for ' || COALESCE(company_name, 'Company') || ' is now awaiting review.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger for submission notifications
DROP TRIGGER IF EXISTS notify_on_submission ON public.challenge_submissions;
CREATE TRIGGER notify_on_submission
  AFTER UPDATE ON public.challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_challenge_submission();

-- 6. Create notification function for review decisions
CREATE OR REPLACE FUNCTION public.notify_review_decision()
RETURNS TRIGGER AS $$
DECLARE
  candidate_user_id UUID;
  challenge_title TEXT;
  company_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
BEGIN
  -- Get candidate auth user_id from invitation
  SELECT p.user_id INTO candidate_user_id
  FROM public.challenge_invitations ci
  JOIN public.profiles p ON p.id = ci.candidate_profile_id
  WHERE ci.id = NEW.invitation_id;
  
  -- Get challenge and company info
  SELECT bc.title INTO challenge_title
  FROM public.business_challenges bc
  WHERE bc.id = NEW.challenge_id;
  
  SELECT bp.company_name INTO company_name
  FROM public.business_profiles bp
  WHERE bp.user_id = NEW.business_id;
  
  -- Set notification based on decision
  CASE NEW.decision
    WHEN 'shortlist' THEN
      notif_type := 'shortlisted';
      notif_title := 'You''ve been shortlisted! 🎉';
      notif_message := COALESCE(company_name, 'A company') || ' has shortlisted you for their role. They may reach out soon.';
    WHEN 'followup' THEN
      notif_type := 'followup_requested';
      notif_title := 'Follow-up Question Requested';
      notif_message := COALESCE(company_name, 'A company') || ' has a follow-up question about your submission.';
    WHEN 'pass' THEN
      notif_type := 'passed';
      notif_title := 'Application Update';
      notif_message := 'You were not selected for the ' || COALESCE(challenge_title, 'role') || ' at ' || COALESCE(company_name, 'this company') || '. Keep going!';
    WHEN 'proceed_level2' THEN
      notif_type := 'advanced_level2';
      notif_title := 'You advanced to Level 2! 🚀';
      notif_message := COALESCE(company_name, 'A company') || ' has invited you to their role-specific challenge. Check your dashboard!';
    ELSE
      RETURN NEW;
  END CASE;
  
  IF candidate_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
    VALUES (
      candidate_user_id,
      NEW.business_id,
      notif_type,
      NEW.invitation_id,
      notif_title,
      notif_message
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create trigger for review decision notifications
DROP TRIGGER IF EXISTS notify_on_review_decision ON public.challenge_reviews;
CREATE TRIGGER notify_on_review_decision
  AFTER INSERT OR UPDATE ON public.challenge_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_review_decision();