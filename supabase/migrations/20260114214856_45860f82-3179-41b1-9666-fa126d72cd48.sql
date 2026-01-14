-- Fix search_path for functions created in previous migration

-- Drop and recreate get_feed_item_reactions with proper search_path
DROP FUNCTION IF EXISTS public.get_feed_item_reactions(uuid);

CREATE OR REPLACE FUNCTION public.get_feed_item_reactions(item_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(reaction_type, count),
    '{}'::jsonb
  )
  FROM public.feed_reaction_counts
  WHERE feed_item_id = item_id;
$$;

-- Drop and recreate add_feed_reaction with proper search_path
DROP FUNCTION IF EXISTS public.add_feed_reaction(uuid, text, text);

CREATE OR REPLACE FUNCTION public.add_feed_reaction(
  p_feed_item_id uuid,
  p_reaction_type text,
  p_reactor_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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