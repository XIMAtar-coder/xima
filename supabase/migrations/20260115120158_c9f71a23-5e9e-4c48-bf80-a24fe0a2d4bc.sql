-- Drop and recreate emit_interest_aggregated_signal with correct parameter names
DROP FUNCTION IF EXISTS public.emit_interest_aggregated_signal(uuid, int);

-- Recreate with ximatar info included
CREATE OR REPLACE FUNCTION public.emit_interest_aggregated_signal(
  p_ximatar_id uuid,
  p_count int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ximatar record;
  v_payload jsonb;
BEGIN
  -- Get ximatar info
  SELECT name, image INTO v_ximatar
  FROM public.ximatars
  WHERE id = p_ximatar_id;
  
  v_payload := jsonb_build_object(
    'normalized_text', p_count || ' companies showed interest',
    'count', p_count,
    'ximatar_name', COALESCE(v_ximatar.name, 'Anonymous'),
    'ximatar_image', COALESCE(v_ximatar.image, '/ximatars/owl.png')
  );
  
  RETURN public.emit_feed_signal(
    'interest_aggregated',
    'system',
    p_ximatar_id,
    v_payload,
    jsonb_build_object('public', false) -- Only visible to candidate
  );
END;
$$;