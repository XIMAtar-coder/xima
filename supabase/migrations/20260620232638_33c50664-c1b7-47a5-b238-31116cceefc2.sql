ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_type_check;

ALTER TABLE public.audit_events
ADD CONSTRAINT audit_events_actor_type_check
CHECK (actor_type = ANY (ARRAY['candidate'::text, 'business'::text, 'mentor'::text, 'system'::text, 'admin'::text]));