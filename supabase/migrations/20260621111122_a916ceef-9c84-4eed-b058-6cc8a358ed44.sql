
CREATE TABLE IF NOT EXISTS public.ai_shared_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global','user')),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_hash TEXT NOT NULL,
  version_tag TEXT NOT NULL,
  result_data JSONB NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_shared_cache TO authenticated;
GRANT ALL ON public.ai_shared_cache TO service_role;

ALTER TABLE public.ai_shared_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own or global"
  ON public.ai_shared_cache
  FOR SELECT
  TO authenticated
  USING (scope = 'global' OR user_id = (select auth.uid()));

CREATE POLICY "service writes"
  ON public.ai_shared_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_shared_cache_key
  ON public.ai_shared_cache
  (function_name, scope, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), input_hash);

CREATE INDEX IF NOT EXISTS idx_ai_shared_cache_expires
  ON public.ai_shared_cache (expires_at);
