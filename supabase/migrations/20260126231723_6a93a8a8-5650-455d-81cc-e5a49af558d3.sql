-- =============================================================================
-- GDPR-SAFE FEED + CHAT REDESIGN MIGRATION
-- Part A: Feed - "One news per login" with strict audience scoping
-- Part B: Chat - Restrict to B2C and M2C only (NO C2C)
-- =============================================================================

-- =============================================================================
-- PART A: FEED SCHEMA CHANGES
-- =============================================================================

-- 1. Create audience_type enum for strict type-safety
CREATE TYPE audience_type_enum AS ENUM ('candidate', 'business', 'mentor');

-- 2. Add new audience columns to feed_items
ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS audience_type audience_type_enum,
  ADD COLUMN IF NOT EXISTS candidate_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid,
  ADD COLUMN IF NOT EXISTS mentor_profile_id uuid,
  ADD COLUMN IF NOT EXISTS priority int DEFAULT 0;

-- 3. Create index for efficient audience-scoped queries
CREATE INDEX IF NOT EXISTS idx_feed_items_audience_candidate 
  ON public.feed_items(candidate_profile_id) 
  WHERE audience_type = 'candidate';

CREATE INDEX IF NOT EXISTS idx_feed_items_audience_business 
  ON public.feed_items(business_id) 
  WHERE audience_type = 'business';

CREATE INDEX IF NOT EXISTS idx_feed_items_audience_mentor 
  ON public.feed_items(mentor_profile_id) 
  WHERE audience_type = 'mentor';

CREATE INDEX IF NOT EXISTS idx_feed_items_priority_created 
  ON public.feed_items(priority DESC, created_at DESC);

-- 4. Create feed_consumption table
CREATE TABLE IF NOT EXISTS public.feed_consumption (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_at timestamptz DEFAULT now(),
  last_seen_feed_item_id uuid REFERENCES public.feed_items(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create seen_feed_item_ids table for tracking multiple seen items
CREATE TABLE IF NOT EXISTS public.feed_seen_items (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feed_item_id uuid NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, feed_item_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_seen_items_profile 
  ON public.feed_seen_items(profile_id);

-- =============================================================================
-- PART A: FEED RLS POLICIES
-- =============================================================================

-- 6. Drop existing permissive feed_items policies
DROP POLICY IF EXISTS "feed_items_read_scoped" ON public.feed_items;
DROP POLICY IF EXISTS "feed_items_select_policy" ON public.feed_items;
DROP POLICY IF EXISTS "Authenticated users can view feed items" ON public.feed_items;
DROP POLICY IF EXISTS "Users can view public or targeted feed items" ON public.feed_items;

-- 7. Create strict audience-scoped SELECT policy for feed_items
CREATE POLICY "feed_items_audience_scoped_select" ON public.feed_items
  FOR SELECT
  TO authenticated
  USING (
    -- Candidates see items targeted to them
    (audience_type = 'candidate' AND candidate_profile_id = auth.uid())
    OR
    -- Businesses see items targeted to them
    (audience_type = 'business' AND business_id = auth.uid())
    OR
    -- Mentors see items targeted to them
    (audience_type = 'mentor' AND mentor_profile_id = auth.uid())
    OR
    -- Candidates can always see items about their own ximatar (via subject_ximatar_id)
    EXISTS (
      SELECT 1 FROM public.assessment_results ar
      WHERE ar.user_id = auth.uid()
        AND ar.ximatar_id = feed_items.subject_ximatar_id
    )
  );

-- 8. Ensure no INSERT/UPDATE from client - only service role or triggers
DROP POLICY IF EXISTS "feed_items_insert_policy" ON public.feed_items;
DROP POLICY IF EXISTS "feed_items_update_policy" ON public.feed_items;

-- No INSERT policy for regular users (only service role can insert)
-- No UPDATE policy for regular users (only service role can update)

-- 9. RLS for feed_consumption
ALTER TABLE public.feed_consumption ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_consumption_owner_select" ON public.feed_consumption;
DROP POLICY IF EXISTS "feed_consumption_owner_upsert" ON public.feed_consumption;

CREATE POLICY "feed_consumption_owner_select" ON public.feed_consumption
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "feed_consumption_owner_insert" ON public.feed_consumption
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "feed_consumption_owner_update" ON public.feed_consumption
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- 10. RLS for feed_seen_items
ALTER TABLE public.feed_seen_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_seen_items_owner_select" ON public.feed_seen_items
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "feed_seen_items_owner_insert" ON public.feed_seen_items
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- =============================================================================
-- PART A: FEED RPC - get_next_feed_item
-- =============================================================================

-- 11. Create get_next_feed_item RPC
CREATE OR REPLACE FUNCTION public.get_next_feed_item()
RETURNS TABLE (
  id uuid,
  type text,
  source text,
  subject_ximatar_id uuid,
  payload jsonb,
  created_at timestamptz,
  priority int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_profile_id uuid;
  is_business boolean := false;
  is_mentor boolean := false;
  next_item record;
BEGIN
  -- Get current user's profile ID
  SELECT p.id INTO current_profile_id
  FROM profiles p
  WHERE p.user_id = current_user_id;
  
  IF current_profile_id IS NULL THEN
    RETURN; -- No profile, no feed
  END IF;
  
  -- Check if user is a business
  IF EXISTS (SELECT 1 FROM business_profiles WHERE user_id = current_user_id) THEN
    is_business := true;
  END IF;
  
  -- Check if user is a mentor (has mentor profile)
  IF EXISTS (SELECT 1 FROM mentors WHERE user_id = current_user_id) THEN
    is_mentor := true;
  END IF;
  
  -- Find next unseen feed item for this user based on their role
  IF is_business THEN
    -- Business user: get business-targeted items
    SELECT fi.* INTO next_item
    FROM feed_items fi
    WHERE fi.audience_type = 'business'
      AND fi.business_id = current_user_id
      AND NOT EXISTS (
        SELECT 1 FROM feed_seen_items fsi
        WHERE fsi.profile_id = current_profile_id
          AND fsi.feed_item_id = fi.id
      )
    ORDER BY fi.priority DESC, fi.created_at DESC
    LIMIT 1;
    
  ELSIF is_mentor THEN
    -- Mentor user: get mentor-targeted items
    SELECT fi.* INTO next_item
    FROM feed_items fi
    WHERE fi.audience_type = 'mentor'
      AND fi.mentor_profile_id = current_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM feed_seen_items fsi
        WHERE fsi.profile_id = current_profile_id
          AND fsi.feed_item_id = fi.id
      )
    ORDER BY fi.priority DESC, fi.created_at DESC
    LIMIT 1;
    
  ELSE
    -- Candidate user: get candidate-targeted items OR items about their ximatar
    SELECT fi.* INTO next_item
    FROM feed_items fi
    WHERE (
      (fi.audience_type = 'candidate' AND fi.candidate_profile_id = current_profile_id)
      OR EXISTS (
        SELECT 1 FROM assessment_results ar
        WHERE ar.user_id = current_user_id
          AND ar.ximatar_id = fi.subject_ximatar_id
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM feed_seen_items fsi
      WHERE fsi.profile_id = current_profile_id
        AND fsi.feed_item_id = fi.id
    )
    ORDER BY fi.priority DESC, fi.created_at DESC
    LIMIT 1;
  END IF;
  
  -- If we found an item, mark it as seen and return it
  IF next_item IS NOT NULL THEN
    -- Mark as seen
    INSERT INTO feed_seen_items (profile_id, feed_item_id, seen_at)
    VALUES (current_profile_id, next_item.id, now())
    ON CONFLICT (profile_id, feed_item_id) DO NOTHING;
    
    -- Update consumption record
    INSERT INTO feed_consumption (profile_id, last_seen_at, last_seen_feed_item_id)
    VALUES (current_profile_id, now(), next_item.id)
    ON CONFLICT (profile_id) 
    DO UPDATE SET 
      last_seen_at = now(),
      last_seen_feed_item_id = next_item.id,
      updated_at = now();
    
    -- Return the item
    RETURN QUERY SELECT 
      next_item.id,
      next_item.type::text,
      next_item.source::text,
      next_item.subject_ximatar_id,
      next_item.payload,
      next_item.created_at,
      next_item.priority;
  END IF;
  
  -- No item found
  RETURN;
END;
$$;

-- =============================================================================
-- PART B: CHAT SCHEMA CHANGES
-- =============================================================================

-- 12. Create thread_type enum
CREATE TYPE thread_type_enum AS ENUM ('business_candidate', 'mentor_candidate');

-- 13. Add new columns to chat_threads
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS thread_type thread_type_enum,
  ADD COLUMN IF NOT EXISTS candidate_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid,
  ADD COLUMN IF NOT EXISTS mentor_profile_id uuid;

-- 14. Add constraints to enforce thread_type rules
-- business_candidate: must have candidate_profile_id AND business_id, no mentor_profile_id
-- mentor_candidate: must have candidate_profile_id AND mentor_profile_id, no business_id

ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chk_thread_type_business_candidate,
  DROP CONSTRAINT IF EXISTS chk_thread_type_mentor_candidate;

ALTER TABLE public.chat_threads
  ADD CONSTRAINT chk_thread_type_business_candidate CHECK (
    thread_type != 'business_candidate' 
    OR (candidate_profile_id IS NOT NULL AND business_id IS NOT NULL AND mentor_profile_id IS NULL)
  ),
  ADD CONSTRAINT chk_thread_type_mentor_candidate CHECK (
    thread_type != 'mentor_candidate' 
    OR (candidate_profile_id IS NOT NULL AND mentor_profile_id IS NOT NULL AND business_id IS NULL)
  );

-- 15. Create indexes for chat lookups
CREATE INDEX IF NOT EXISTS idx_chat_threads_candidate 
  ON public.chat_threads(candidate_profile_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_business 
  ON public.chat_threads(business_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_mentor 
  ON public.chat_threads(mentor_profile_id);

-- =============================================================================
-- PART B: CHAT RLS POLICIES
-- =============================================================================

-- 16. Drop old chat_threads policies
DROP POLICY IF EXISTS "Users can view threads they participate in" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can create threads" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_select_policy" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_insert_policy" ON public.chat_threads;

-- 17. Create strict SELECT policy for chat_threads
CREATE POLICY "chat_threads_participant_select" ON public.chat_threads
  FOR SELECT
  TO authenticated
  USING (
    -- User is the candidate in the thread
    candidate_profile_id = auth.uid()
    OR
    -- User is the business in the thread
    business_id = auth.uid()
    OR
    -- User is the mentor in the thread
    mentor_profile_id = auth.uid()
    OR
    -- Legacy: user is a participant (for existing threads before migration)
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.thread_id = chat_threads.id
        AND cp.user_id = auth.uid()
    )
  );

-- 18. Chat thread INSERT - only through RPC (no direct insert)
-- We'll handle thread creation via a secure RPC that validates mutual_interest or mentor_match

-- 19. Drop and recreate chat_messages policies with WITH CHECK
DROP POLICY IF EXISTS "Users can send messages to their threads" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_hardened_insert" ON public.chat_messages;

CREATE POLICY "chat_messages_participant_insert" ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sender must be the authenticated user
    sender_id = auth.uid()
    AND
    -- User must be a participant in the thread (via new columns OR legacy participants table)
    EXISTS (
      SELECT 1 FROM chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND (
          ct.candidate_profile_id = auth.uid()
          OR ct.business_id = auth.uid()
          OR ct.mentor_profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.thread_id = ct.id
              AND cp.user_id = auth.uid()
          )
        )
    )
  );

-- 20. Create RPC for secure thread creation (B2C and M2C only)
CREATE OR REPLACE FUNCTION public.create_chat_thread(
  p_thread_type text,
  p_candidate_profile_id uuid,
  p_business_id uuid DEFAULT NULL,
  p_mentor_profile_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  new_thread_id uuid;
  mutual_interest_exists boolean := false;
  mentor_match_exists boolean := false;
BEGIN
  -- Validate thread_type
  IF p_thread_type NOT IN ('business_candidate', 'mentor_candidate') THEN
    RAISE EXCEPTION 'Invalid thread_type: %', p_thread_type;
  END IF;
  
  -- Business-Candidate thread validation
  IF p_thread_type = 'business_candidate' THEN
    IF p_business_id IS NULL THEN
      RAISE EXCEPTION 'business_id required for business_candidate thread';
    END IF;
    IF p_mentor_profile_id IS NOT NULL THEN
      RAISE EXCEPTION 'mentor_profile_id must be null for business_candidate thread';
    END IF;
    
    -- Verify caller is either the business or the candidate
    IF current_user_id != p_business_id AND current_user_id != p_candidate_profile_id THEN
      -- Check if user's profile matches candidate_profile_id
      IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_candidate_profile_id AND user_id = current_user_id
      ) THEN
        RAISE EXCEPTION 'Not authorized to create this thread';
      END IF;
    END IF;
    
    -- Verify mutual_interest exists between this candidate and business
    SELECT EXISTS (
      SELECT 1 FROM mutual_interests mi
      WHERE mi.candidate_profile_id = p_candidate_profile_id
        AND mi.business_id = p_business_id
        AND mi.accepted = true
    ) INTO mutual_interest_exists;
    
    IF NOT mutual_interest_exists THEN
      RAISE EXCEPTION 'Mutual interest required to create B2C chat thread';
    END IF;
    
    -- Check if thread already exists
    SELECT id INTO new_thread_id
    FROM chat_threads
    WHERE thread_type = 'business_candidate'::thread_type_enum
      AND candidate_profile_id = p_candidate_profile_id
      AND business_id = p_business_id
    LIMIT 1;
    
    IF new_thread_id IS NOT NULL THEN
      RETURN new_thread_id; -- Return existing thread
    END IF;
    
    -- Create the thread
    INSERT INTO chat_threads (
      thread_type, candidate_profile_id, business_id, created_by, is_group
    ) VALUES (
      'business_candidate'::thread_type_enum, 
      p_candidate_profile_id, 
      p_business_id, 
      current_user_id,
      false
    )
    RETURNING id INTO new_thread_id;
    
  -- Mentor-Candidate thread validation  
  ELSIF p_thread_type = 'mentor_candidate' THEN
    IF p_mentor_profile_id IS NULL THEN
      RAISE EXCEPTION 'mentor_profile_id required for mentor_candidate thread';
    END IF;
    IF p_business_id IS NOT NULL THEN
      RAISE EXCEPTION 'business_id must be null for mentor_candidate thread';
    END IF;
    
    -- Verify caller is either the mentor or the candidate
    IF current_user_id != p_mentor_profile_id THEN
      -- Check if user's profile matches candidate_profile_id
      IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_candidate_profile_id AND user_id = current_user_id
      ) THEN
        -- Check if caller is the mentor
        IF NOT EXISTS (
          SELECT 1 FROM mentors WHERE user_id = current_user_id AND id = p_mentor_profile_id
        ) THEN
          RAISE EXCEPTION 'Not authorized to create this thread';
        END IF;
      END IF;
    END IF;
    
    -- Verify mentor_match exists
    SELECT EXISTS (
      SELECT 1 FROM mentor_matches mm
      JOIN profiles p ON p.id = p_candidate_profile_id
      WHERE mm.mentee_user_id = p.id
        AND mm.mentor_user_id = p_mentor_profile_id
    ) INTO mentor_match_exists;
    
    IF NOT mentor_match_exists THEN
      RAISE EXCEPTION 'Mentor match required to create M2C chat thread';
    END IF;
    
    -- Check if thread already exists
    SELECT id INTO new_thread_id
    FROM chat_threads
    WHERE thread_type = 'mentor_candidate'::thread_type_enum
      AND candidate_profile_id = p_candidate_profile_id
      AND mentor_profile_id = p_mentor_profile_id
    LIMIT 1;
    
    IF new_thread_id IS NOT NULL THEN
      RETURN new_thread_id; -- Return existing thread
    END IF;
    
    -- Create the thread
    INSERT INTO chat_threads (
      thread_type, candidate_profile_id, mentor_profile_id, created_by, is_group
    ) VALUES (
      'mentor_candidate'::thread_type_enum, 
      p_candidate_profile_id, 
      p_mentor_profile_id, 
      current_user_id,
      false
    )
    RETURNING id INTO new_thread_id;
    
  END IF;
  
  RETURN new_thread_id;
END;
$$;

-- =============================================================================
-- CLEANUP: Remove global search capability
-- =============================================================================

-- 21. Revoke direct INSERT on chat_threads from authenticated (force RPC usage)
-- Note: We don't revoke SELECT as that's handled by RLS

-- Grant execute on the new RPCs
GRANT EXECUTE ON FUNCTION public.get_next_feed_item() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chat_thread(text, uuid, uuid, uuid) TO authenticated;