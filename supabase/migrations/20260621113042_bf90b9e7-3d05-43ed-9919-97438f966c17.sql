-- Harden ai_shared_cache RPCs: revoke from anon/authenticated, keep only service_role

REVOKE EXECUTE ON FUNCTION public.ai_shared_cache_get(text, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ai_shared_cache_get(text, text, uuid, text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.ai_shared_cache_put(text, text, uuid, text, text, jsonb, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ai_shared_cache_put(text, text, uuid, text, text, jsonb, int) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.ai_shared_cache_get(text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_shared_cache_put(text, text, uuid, text, text, jsonb, int) TO service_role;