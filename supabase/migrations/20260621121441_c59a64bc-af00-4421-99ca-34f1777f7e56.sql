-- Upsert without ON CONFLICT (no unique constraint on (provider,model_name))
UPDATE public.model_prices
   SET input_price_per_1k = 0.003000, output_price_per_1k = 0.015000,
       active = true, currency = 'USD', updated_at = now(),
       notes = 'Sonnet 4.6 (recommend-jobs, analyze-cv, generate-company-profile, l3 stack)'
 WHERE provider = 'anthropic' AND model_name = 'claude-sonnet-4-6';

INSERT INTO public.model_prices (provider, model_name, input_price_per_1k, output_price_per_1k, currency, active, notes)
SELECT 'anthropic', 'claude-sonnet-4-6', 0.003000, 0.015000, 'USD', true,
       'Sonnet 4.6 (recommend-jobs, analyze-cv, generate-company-profile, l3 stack)'
 WHERE NOT EXISTS (SELECT 1 FROM public.model_prices WHERE provider='anthropic' AND model_name='claude-sonnet-4-6');

UPDATE public.model_prices
   SET input_price_per_1k = 0.000250, output_price_per_1k = 0.001250,
       active = true, currency = 'USD', updated_at = now(),
       notes = 'Haiku 4.5 (default Anthropic routing fallback)'
 WHERE provider = 'anthropic' AND model_name = 'claude-haiku-4-5-20251001';

INSERT INTO public.model_prices (provider, model_name, input_price_per_1k, output_price_per_1k, currency, active, notes)
SELECT 'anthropic', 'claude-haiku-4-5-20251001', 0.000250, 0.001250, 'USD', true,
       'Haiku 4.5 (default Anthropic routing fallback)'
 WHERE NOT EXISTS (SELECT 1 FROM public.model_prices WHERE provider='anthropic' AND model_name='claude-haiku-4-5-20251001');

-- Backfill cost_usd for recent rows
UPDATE public.ai_invocation_log l
   SET cost_usd = ROUND(
         ((COALESCE(l.input_tokens, 0)::numeric / 1000.0) * mp.input_price_per_1k) +
         ((COALESCE(l.output_tokens, 0)::numeric / 1000.0) * mp.output_price_per_1k)
       , 6)
  FROM public.model_prices mp
 WHERE l.cost_usd IS NULL
   AND l.model_name = mp.model_name
   AND mp.provider = mp.provider
   AND mp.active = true;