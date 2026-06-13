CREATE TABLE public.guest_rate_limit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ip_hash, window_start)
);

CREATE INDEX idx_guest_rate_limit_lookup ON public.guest_rate_limit (ip_hash, window_start);

GRANT ALL ON public.guest_rate_limit TO service_role;

ALTER TABLE public.guest_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_guest_rate_limit"
ON public.guest_rate_limit
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Cleanup function: callers (edge function) prune old rows
CREATE OR REPLACE FUNCTION public.cleanup_guest_rate_limit()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.guest_rate_limit WHERE window_start < now() - interval '24 hours';
$$;