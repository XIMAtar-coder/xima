-- Add source validation guard to emit_feed_signal function
CREATE OR REPLACE FUNCTION public.emit_feed_signal(p_type text, p_source text, p_subject_ximatar_id uuid, p_payload jsonb, p_visibility jsonb DEFAULT '{"public": true}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload_hash text;
  existing_id uuid;
  new_id uuid;
  validated_source text;
BEGIN
  -- Validate and normalize source - must be exactly one of: candidate, business, system
  validated_source := lower(trim(p_source));
  
  IF validated_source NOT IN ('candidate', 'business', 'system') THEN
    RAISE EXCEPTION 'Invalid source: %, allowed: candidate|business|system', p_source;
  END IF;

  -- Generate a hash for deduplication (type + ximatar + core payload elements)
  payload_hash := encode(
    sha256(
      (p_type || p_subject_ximatar_id::text || COALESCE(p_payload->>'level', '') || COALESCE(p_payload->>'challenge_id', '') || COALESCE(p_payload->>'skill', ''))::bytea
    ),
    'hex'
  );
  
  -- Check for duplicate within last 24 hours
  SELECT id INTO existing_id
  FROM public.feed_items
  WHERE type = p_type
    AND subject_ximatar_id = p_subject_ximatar_id
    AND created_at > (now() - interval '24 hours')
    AND payload->>'_hash' = payload_hash
  LIMIT 1;
  
  -- Skip if duplicate exists
  IF existing_id IS NOT NULL THEN
    RAISE NOTICE 'Duplicate feed signal skipped: type=%, ximatar=%', p_type, p_subject_ximatar_id;
    RETURN existing_id;
  END IF;
  
  -- Insert new feed item with hash for future dedup, using validated source
  INSERT INTO public.feed_items (type, source, subject_ximatar_id, payload, visibility)
  VALUES (
    p_type,
    validated_source,
    p_subject_ximatar_id,
    p_payload || jsonb_build_object('_hash', payload_hash),
    p_visibility
  )
  RETURNING id INTO new_id;
  
  RAISE NOTICE 'Feed signal emitted: id=%, type=%, ximatar=%', new_id, p_type, p_subject_ximatar_id;
  RETURN new_id;
END;
$function$;