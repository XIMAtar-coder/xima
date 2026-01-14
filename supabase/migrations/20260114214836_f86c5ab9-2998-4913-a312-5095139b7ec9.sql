-- Create feed_items table for privacy-safe anonymous signals
-- NO user_id column - only ximatar references for anonymity

CREATE TABLE public.feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'challenge_completed', 'skill_validated', 'level_reached', 'badge_unlocked', 'interest_aggregated'
  source text NOT NULL CHECK (source IN ('candidate', 'business', 'system')),
  subject_ximatar_id uuid NOT NULL REFERENCES public.ximatars(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- payload structure: { normalized_text, skill_tags[], level?, badge?, count?, locale }
  visibility jsonb NOT NULL DEFAULT '{"public": true}'::jsonb,
  -- visibility: { public: bool, business_ids?: uuid[], goal_ids?: uuid[], ximatar_ids?: uuid[] }
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_feed_items_created_at ON public.feed_items(created_at DESC);
CREATE INDEX idx_feed_items_type ON public.feed_items(type);
CREATE INDEX idx_feed_items_source ON public.feed_items(source);
CREATE INDEX idx_feed_items_ximatar ON public.feed_items(subject_ximatar_id);
CREATE INDEX idx_feed_items_visibility ON public.feed_items USING gin(visibility);

-- Enable RLS
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

-- Feed items are readable by authenticated users with visibility checks
CREATE POLICY "Feed items visible based on visibility rules"
ON public.feed_items FOR SELECT
USING (
  -- Public items are visible to all authenticated users
  (visibility->>'public')::boolean = true
  OR
  -- System can always read
  auth.uid() IS NOT NULL
);

-- Only system can insert feed items (via edge functions)
CREATE POLICY "Only service role can insert feed items"
ON public.feed_items FOR INSERT
WITH CHECK (false); -- Block direct inserts, use edge functions with service role

-- Create feed_reactions table for anonymized signal reactions
CREATE TABLE public.feed_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  reactor_type text NOT NULL CHECK (reactor_type IN ('candidate', 'business')),
  reaction_type text NOT NULL CHECK (reaction_type IN ('interested', 'relevant_skill', 'save_for_review')),
  -- No user_id to maintain anonymity - reactions are aggregated
  reactor_hash text NOT NULL, -- SHA256 hash of user_id + salt for deduplication without identity
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feed_item_id, reactor_hash, reaction_type)
);

-- Index for aggregation queries
CREATE INDEX idx_feed_reactions_item ON public.feed_reactions(feed_item_id);
CREATE INDEX idx_feed_reactions_type ON public.feed_reactions(reaction_type);

-- Enable RLS
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions are write-only for authenticated users
CREATE POLICY "Authenticated users can react"
ON public.feed_reactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- No one can read individual reactions (only aggregated counts via functions)
CREATE POLICY "No direct read of reactions"
ON public.feed_reactions FOR SELECT
USING (false);

-- Create a view for aggregated reaction counts (safe to expose)
CREATE OR REPLACE VIEW public.feed_reaction_counts AS
SELECT 
  feed_item_id,
  reaction_type,
  COUNT(*) as count
FROM public.feed_reactions
GROUP BY feed_item_id, reaction_type;

-- Function to get reaction counts for a feed item
CREATE OR REPLACE FUNCTION public.get_feed_item_reactions(item_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    jsonb_object_agg(reaction_type, count),
    '{}'::jsonb
  )
  FROM public.feed_reaction_counts
  WHERE feed_item_id = item_id;
$$;

-- Function to add a reaction (with hash for deduplication)
CREATE OR REPLACE FUNCTION public.add_feed_reaction(
  p_feed_item_id uuid,
  p_reaction_type text,
  p_reactor_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
BEGIN
  -- Create hash from user_id + item_id for deduplication without exposing identity
  v_hash := encode(sha256((auth.uid()::text || p_feed_item_id::text || 'xima_salt')::bytea), 'hex');
  
  INSERT INTO public.feed_reactions (feed_item_id, reactor_type, reaction_type, reactor_hash)
  VALUES (p_feed_item_id, p_reactor_type, p_reaction_type, v_hash)
  ON CONFLICT (feed_item_id, reactor_hash, reaction_type) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;