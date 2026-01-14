-- Table to track mutual interest between businesses and candidates (via ximatar for privacy)
CREATE TABLE public.mutual_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  candidate_ximatar_id uuid NOT NULL REFERENCES public.ximatars(id),
  hiring_goal_id uuid REFERENCES public.hiring_goal_drafts(id),
  feed_item_id uuid REFERENCES public.feed_items(id),
  business_interested_at timestamptz,
  candidate_accepted_at timestamptz,
  chat_thread_id uuid REFERENCES public.chat_threads(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, candidate_ximatar_id, hiring_goal_id)
);

-- Enable RLS
ALTER TABLE public.mutual_interest ENABLE ROW LEVEL SECURITY;

-- RLS: Businesses can see their own interest records
CREATE POLICY "Businesses can view own interest records"
  ON public.mutual_interest FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS: Candidates can see interest in their ximatar
CREATE POLICY "Candidates can view interest in their ximatar"
  ON public.mutual_interest FOR SELECT
  USING (
    candidate_ximatar_id IN (
      SELECT ximatar_id FROM public.assessment_results WHERE user_id = auth.uid()
    )
  );

-- Function: Record business interest (called from feed reaction)
CREATE OR REPLACE FUNCTION public.record_business_interest(
  p_feed_item_id uuid,
  p_hiring_goal_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_candidate_ximatar_id uuid;
  v_interest_id uuid;
BEGIN
  -- Get business ID from current user
  SELECT id INTO v_business_id 
  FROM public.business_profiles 
  WHERE user_id = auth.uid();
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'User is not a business';
  END IF;
  
  -- Get candidate ximatar from feed item
  SELECT subject_ximatar_id INTO v_candidate_ximatar_id
  FROM public.feed_items
  WHERE id = p_feed_item_id;
  
  IF v_candidate_ximatar_id IS NULL THEN
    RAISE EXCEPTION 'Feed item not found';
  END IF;
  
  -- Insert or update interest record
  INSERT INTO public.mutual_interest (
    business_id, 
    candidate_ximatar_id, 
    hiring_goal_id,
    feed_item_id,
    business_interested_at
  )
  VALUES (
    v_business_id, 
    v_candidate_ximatar_id, 
    p_hiring_goal_id,
    p_feed_item_id,
    now()
  )
  ON CONFLICT (business_id, candidate_ximatar_id, hiring_goal_id) 
  DO UPDATE SET 
    business_interested_at = COALESCE(mutual_interest.business_interested_at, now()),
    updated_at = now()
  RETURNING id INTO v_interest_id;
  
  RETURN v_interest_id;
END;
$$;

-- Function: Candidate accepts interest (creates chat if mutual)
CREATE OR REPLACE FUNCTION public.accept_interest(
  p_interest_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interest record;
  v_candidate_user_id uuid;
  v_business_user_id uuid;
  v_thread_id uuid;
BEGIN
  -- Get interest record
  SELECT * INTO v_interest
  FROM public.mutual_interest
  WHERE id = p_interest_id;
  
  IF v_interest IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Interest record not found');
  END IF;
  
  -- Verify current user owns this ximatar
  SELECT ar.user_id INTO v_candidate_user_id
  FROM public.assessment_results ar
  WHERE ar.ximatar_id = v_interest.candidate_ximatar_id
  LIMIT 1;
  
  IF v_candidate_user_id IS NULL OR v_candidate_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Check if business has shown interest
  IF v_interest.business_interested_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Business has not shown interest yet');
  END IF;
  
  -- Mark candidate as accepted
  UPDATE public.mutual_interest
  SET 
    candidate_accepted_at = now(),
    updated_at = now()
  WHERE id = p_interest_id;
  
  -- If chat doesn't exist yet, create it
  IF v_interest.chat_thread_id IS NULL THEN
    -- Get business user ID
    SELECT user_id INTO v_business_user_id
    FROM public.business_profiles
    WHERE id = v_interest.business_id;
    
    -- Create chat thread
    INSERT INTO public.chat_threads (created_by, topic)
    VALUES (v_candidate_user_id, 'Mutual Interest Chat')
    RETURNING id INTO v_thread_id;
    
    -- Add participants
    INSERT INTO public.chat_participants (thread_id, user_id, role)
    VALUES 
      (v_thread_id, v_candidate_user_id, 'candidate'),
      (v_thread_id, v_business_user_id, 'business');
    
    -- Link thread to interest record
    UPDATE public.mutual_interest
    SET chat_thread_id = v_thread_id
    WHERE id = p_interest_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'chat_created', true,
      'thread_id', v_thread_id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'chat_created', false,
    'thread_id', v_interest.chat_thread_id
  );
END;
$$;

-- Function: Get aggregated interest count for a ximatar (for candidates)
CREATE OR REPLACE FUNCTION public.get_interest_count_for_ximatar(
  p_ximatar_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.mutual_interest
  WHERE candidate_ximatar_id = p_ximatar_id
    AND business_interested_at IS NOT NULL;
$$;

-- Function: Get pending interests for current user (candidate)
CREATE OR REPLACE FUNCTION public.get_pending_interests()
RETURNS TABLE (
  id uuid,
  business_name text,
  hiring_goal_title text,
  interested_at timestamptz,
  accepted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mi.id,
    bp.company_name as business_name,
    hg.role_title as hiring_goal_title,
    mi.business_interested_at as interested_at,
    mi.candidate_accepted_at IS NOT NULL as accepted
  FROM public.mutual_interest mi
  JOIN public.business_profiles bp ON bp.id = mi.business_id
  LEFT JOIN public.hiring_goal_drafts hg ON hg.id = mi.hiring_goal_id
  WHERE mi.candidate_ximatar_id IN (
    SELECT ximatar_id FROM public.assessment_results WHERE user_id = auth.uid()
  )
  AND mi.business_interested_at IS NOT NULL
  ORDER BY mi.business_interested_at DESC;
$$;

-- Trigger: Auto-record business interest when they react with "interested" or "save_for_review"
CREATE OR REPLACE FUNCTION public.trg_auto_record_business_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_reactor_user_id uuid;
BEGIN
  -- Only for "interested" or "save_for_review" reactions
  IF NEW.reaction_type NOT IN ('interested', 'save_for_review') THEN
    RETURN NEW;
  END IF;
  
  -- Only for business reactors
  IF NEW.reactor_type != 'business' THEN
    RETURN NEW;
  END IF;
  
  -- Get business ID from the reactor hash (we need to find who reacted)
  -- Since we hash, we cannot reverse it. Instead, check if current session user is a business
  -- This trigger runs on INSERT, so we can use auth.uid() if available
  SELECT id INTO v_business_id 
  FROM public.business_profiles 
  WHERE user_id = auth.uid();
  
  IF v_business_id IS NOT NULL THEN
    -- Record the interest
    PERFORM public.record_business_interest(NEW.feed_item_id, NULL);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feed_reaction_record_interest
  AFTER INSERT ON public.feed_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_record_business_interest();

-- Index for performance
CREATE INDEX idx_mutual_interest_ximatar ON public.mutual_interest(candidate_ximatar_id);
CREATE INDEX idx_mutual_interest_business ON public.mutual_interest(business_id);