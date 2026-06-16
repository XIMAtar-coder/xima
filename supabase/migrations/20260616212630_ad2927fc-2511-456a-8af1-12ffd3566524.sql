-- XIMA Manager — cost tracking (admin-only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='cost_category') THEN
    CREATE TYPE public.cost_category AS ENUM ('ai','hosting_site','database','development','other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='cost_recurrence') THEN
    CREATE TYPE public.cost_recurrence AS ENUM ('monthly','one_off');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_costs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    public.cost_category   NOT NULL,
  label       text NOT NULL,
  amount      numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency    text NOT NULL DEFAULT 'EUR',
  recurrence  public.cost_recurrence NOT NULL DEFAULT 'monthly',
  incurred_on date NOT NULL DEFAULT current_date,
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_costs TO authenticated;
GRANT ALL ON public.platform_costs TO service_role;

ALTER TABLE public.platform_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage costs" ON public.platform_costs;
CREATE POLICY "admins manage costs" ON public.platform_costs
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_costs()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY (t).created_at DESC), '[]'::json)
  INTO result
  FROM (
    SELECT id, category::text AS category, label, amount, currency,
           recurrence::text AS recurrence, incurred_on, active, notes, created_at
    FROM public.platform_costs
  ) t;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_get_costs_summary()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_build_object(
    'currency', 'EUR',
    'monthly_total',           COALESCE((SELECT sum(amount) FROM public.platform_costs WHERE recurrence='monthly' AND active),0),
    'monthly_by_category',     COALESCE((SELECT json_object_agg(cat,s) FROM (SELECT category::text cat,sum(amount) s FROM public.platform_costs WHERE recurrence='monthly' AND active GROUP BY category) t),'{}'::json),
    'oneoff_total_12m',        COALESCE((SELECT sum(amount) FROM public.platform_costs WHERE recurrence='one_off' AND incurred_on >= current_date-interval '12 months'),0),
    'oneoff_by_category_12m',  COALESCE((SELECT json_object_agg(cat,s) FROM (SELECT category::text cat,sum(amount) s FROM public.platform_costs WHERE recurrence='one_off' AND incurred_on >= current_date-interval '12 months' GROUP BY category) t),'{}'::json),
    'entries_count',           (SELECT count(*) FROM public.platform_costs),
    'ai_invocations_30d',      (SELECT count(*) FROM public.ai_invocation_log WHERE invoked_at >= now()-interval '30 days')
  ) INTO result;
  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_costs()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_costs_summary() TO authenticated;