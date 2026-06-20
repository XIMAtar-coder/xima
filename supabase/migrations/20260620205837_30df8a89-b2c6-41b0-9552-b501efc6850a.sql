CREATE OR REPLACE FUNCTION public.health_db()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$ select now() $$;

GRANT EXECUTE ON FUNCTION public.health_db() TO authenticated;