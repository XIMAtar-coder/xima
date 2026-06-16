CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _business_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.business_profiles
        WHERE id = _business_id AND user_id = auth.uid()
      );
$function$;