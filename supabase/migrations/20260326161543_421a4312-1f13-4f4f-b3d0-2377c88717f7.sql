
-- Track AI call usage per user per month
CREATE TABLE IF NOT EXISTS public.ai_usage_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  calls_used INTEGER DEFAULT 0,
  calls_limit INTEGER DEFAULT 3,
  tier TEXT DEFAULT 'freemium',
  last_function_called TEXT,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_key)
);

CREATE INDEX idx_ai_usage_user_month ON ai_usage_budget(user_id, month_key);

ALTER TABLE ai_usage_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON ai_usage_budget
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages usage" ON ai_usage_budget
  FOR ALL USING (true)
  WITH CHECK (true);

-- Cache table for storing last successful AI results per function per user
CREATE TABLE IF NOT EXISTS public.ai_result_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  result_data JSONB NOT NULL,
  input_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, function_name)
);

CREATE INDEX idx_ai_cache_user ON ai_result_cache(user_id, function_name);

ALTER TABLE ai_result_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cache" ON ai_result_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages cache" ON ai_result_cache
  FOR ALL USING (true)
  WITH CHECK (true);
