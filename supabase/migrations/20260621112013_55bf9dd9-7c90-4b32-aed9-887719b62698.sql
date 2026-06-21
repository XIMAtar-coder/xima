-- Helper RPCs for ai_shared_cache atomic get/put with expression-index ON CONFLICT

CREATE OR REPLACE FUNCTION public.ai_shared_cache_get(
  _function_name text,
  _scope text,
  _user_id uuid,
  _input_hash text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ai_shared_cache%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.ai_shared_cache
  WHERE function_name = _function_name
    AND scope = _scope
    AND COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND input_hash = _input_hash
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Increment hits asynchronously (best-effort, same txn is fine)
  UPDATE public.ai_shared_cache
  SET hits = hits + 1
  WHERE id = v_row.id;

  RETURN v_row.result_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_shared_cache_put(
  _function_name text,
  _scope text,
  _user_id uuid,
  _input_hash text,
  _version_tag text,
  _result_data jsonb,
  _ttl_seconds int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_shared_cache (
    function_name, scope, user_id, input_hash, version_tag, result_data, hits, expires_at
  ) VALUES (
    _function_name, _scope, _user_id, _input_hash, _version_tag, _result_data, 0,
    now() + make_interval(secs => _ttl_seconds)
  )
  ON CONFLICT (function_name, scope, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), input_hash)
  DO UPDATE SET
    result_data = EXCLUDED.result_data,
    version_tag = EXCLUDED.version_tag,
    expires_at  = EXCLUDED.expires_at,
    hits        = public.ai_shared_cache.hits;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_shared_cache_get(text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_shared_cache_put(text, text, uuid, text, text, jsonb, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_shared_cache_get(text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_shared_cache_put(text, text, uuid, text, text, jsonb, int) TO service_role;
