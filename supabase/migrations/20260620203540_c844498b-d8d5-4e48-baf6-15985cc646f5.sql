-- 1. Add token/cost columns to ai_invocation_log
ALTER TABLE public.ai_invocation_log
  ADD COLUMN IF NOT EXISTS input_tokens integer,
  ADD COLUMN IF NOT EXISTS output_tokens integer,
  ADD COLUMN IF NOT EXISTS total_tokens integer GENERATED ALWAYS AS (COALESCE(input_tokens,0) + COALESCE(output_tokens,0)) STORED,
  ADD COLUMN IF NOT EXISTS cost_usd numeric(12,6);

CREATE INDEX IF NOT EXISTS idx_ai_invocation_log_invoked_at ON public.ai_invocation_log (invoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_invocation_log_fn_invoked_at ON public.ai_invocation_log (function_name, invoked_at DESC);

-- 2. model_prices table
CREATE TABLE IF NOT EXISTS public.model_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_name text NOT NULL,
  input_price_per_1k numeric(12,6) NOT NULL,
  output_price_per_1k numeric(12,6) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model_name, active)
);

GRANT SELECT ON public.model_prices TO authenticated;
GRANT ALL ON public.model_prices TO service_role;

ALTER TABLE public.model_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "model_prices read authenticated" ON public.model_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "model_prices admin write" ON public.model_prices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_model_prices_updated_at
  BEFORE UPDATE ON public.model_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. compute_ai_cost_usd helper
CREATE OR REPLACE FUNCTION public.compute_ai_cost_usd(
  _provider text,
  _model_name text,
  _input_tokens integer,
  _output_tokens integer
) RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ROUND(
    (COALESCE(_input_tokens,0) / 1000.0) * mp.input_price_per_1k +
    (COALESCE(_output_tokens,0) / 1000.0) * mp.output_price_per_1k
  , 6)
  FROM public.model_prices mp
  WHERE mp.active = true
    AND mp.provider = _provider
    AND mp.model_name = _model_name
  LIMIT 1
$$;

-- 4. Seed prices (Anthropic + Lovable Gateway models)
INSERT INTO public.model_prices (provider, model_name, input_price_per_1k, output_price_per_1k, notes) VALUES
  ('anthropic', 'claude-haiku-4-5',     0.001,  0.005,  'Haiku 4.5'),
  ('anthropic', 'claude-sonnet-4-5',    0.003,  0.015,  'Sonnet 4.5'),
  ('anthropic', 'claude-opus-4-5',      0.015,  0.075,  'Opus 4.5 (placeholder)'),
  ('lovable_gateway', 'google/gemini-2.5-flash',      0.0003, 0.0025, 'Gemini 2.5 Flash'),
  ('lovable_gateway', 'google/gemini-2.5-flash-lite', 0.0001, 0.0004, 'Gemini 2.5 Flash Lite'),
  ('lovable_gateway', 'google/gemini-2.5-pro',        0.00125,0.01,   'Gemini 2.5 Pro')
ON CONFLICT DO NOTHING;

-- 5. admin_get_ai_costs_summary RPC
CREATE OR REPLACE FUNCTION public.admin_get_ai_costs_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _last30d_usd numeric;
  _mtd_usd numeric;
  _by_function jsonb;
  _by_model jsonb;
  _unpriced jsonb;
  _missing_pct numeric;
  _total_calls bigint;
  _missing_calls bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(cost_usd),0) INTO _last30d_usd
  FROM public.ai_invocation_log
  WHERE invoked_at >= now() - interval '30 days';

  SELECT COALESCE(SUM(cost_usd),0) INTO _mtd_usd
  FROM public.ai_invocation_log
  WHERE invoked_at >= date_trunc('month', now());

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _by_function
  FROM (
    SELECT function_name,
           COUNT(*) AS calls,
           COALESCE(SUM(input_tokens),0)  AS input_tokens,
           COALESCE(SUM(output_tokens),0) AS output_tokens,
           COALESCE(SUM(cost_usd),0)      AS cost_usd
    FROM public.ai_invocation_log
    WHERE invoked_at >= now() - interval '30 days'
    GROUP BY function_name
    ORDER BY cost_usd DESC NULLS LAST
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _by_model
  FROM (
    SELECT COALESCE(provider,'unknown')   AS provider,
           COALESCE(model_name,'unknown') AS model_name,
           COUNT(*) AS calls,
           COALESCE(SUM(input_tokens),0)  AS input_tokens,
           COALESCE(SUM(output_tokens),0) AS output_tokens,
           COALESCE(SUM(cost_usd),0)      AS cost_usd
    FROM public.ai_invocation_log
    WHERE invoked_at >= now() - interval '30 days'
    GROUP BY provider, model_name
    ORDER BY cost_usd DESC NULLS LAST
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(u)), '[]'::jsonb) INTO _unpriced
  FROM (
    SELECT DISTINCT l.provider, l.model_name
    FROM public.ai_invocation_log l
    WHERE l.invoked_at >= now() - interval '30 days'
      AND (COALESCE(l.input_tokens,0) + COALESCE(l.output_tokens,0)) > 0
      AND l.provider IS NOT NULL
      AND l.model_name IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.model_prices mp
        WHERE mp.active = true
          AND mp.provider = l.provider
          AND mp.model_name = l.model_name
      )
  ) u;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE cost_usd IS NULL)
    INTO _total_calls, _missing_calls
  FROM public.ai_invocation_log
  WHERE invoked_at >= now() - interval '30 days';

  _missing_pct := CASE WHEN _total_calls > 0
    THEN ROUND((_missing_calls::numeric / _total_calls::numeric) * 100, 2)
    ELSE 0 END;

  _result := jsonb_build_object(
    'last30d_usd', _last30d_usd,
    'mtd_usd', _mtd_usd,
    'by_function', _by_function,
    'by_model', _by_model,
    'unpriced_models', _unpriced,
    'missing_usage_pct', _missing_pct,
    'total_calls_30d', _total_calls,
    'missing_calls_30d', _missing_calls
  );
  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_ai_costs_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_ai_cost_usd(text, text, integer, integer) TO authenticated, service_role;
