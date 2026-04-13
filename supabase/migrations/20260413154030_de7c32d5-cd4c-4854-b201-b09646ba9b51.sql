CREATE OR REPLACE FUNCTION public.trg_audit_hiring_goal_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.emit_audit_event(
    'business', NEW.business_id, 'business.hiring_goal_created', 'hiring_goal', NEW.id::text,
    NULL, NULL, pg_catalog.jsonb_build_object('title', NEW.role_title)
  );
  RETURN NEW;
END;
$$;