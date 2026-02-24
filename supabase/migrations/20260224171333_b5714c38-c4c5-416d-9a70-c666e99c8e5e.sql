
-- =====================================================
-- Step 4: Observability & Audit Events
-- =====================================================

-- 1. audit_events table
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('candidate', 'business', 'mentor', 'system')),
  actor_id uuid, -- nullable for GDPR deletion
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text, -- string to support various ID formats
  correlation_id text,
  attempt_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip_hash text,
  user_agent_hash text
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_events_occurred_at ON public.audit_events (occurred_at DESC);
CREATE INDEX idx_audit_events_action ON public.audit_events (action);
CREATE INDEX idx_audit_events_correlation_id ON public.audit_events (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_audit_events_actor_id ON public.audit_events (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_events_entity ON public.audit_events (entity_type, entity_id);

-- RLS: service_role writes, admin reads
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.audit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin read access" ON public.audit_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. metrics_daily aggregation table
CREATE TABLE public.metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric_date, metric_name)
);

CREATE INDEX idx_metrics_daily_date ON public.metrics_daily (metric_date DESC);
CREATE INDEX idx_metrics_daily_name ON public.metrics_daily (metric_name);

ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.metrics_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin read access" ON public.metrics_daily
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Helper function: emit_audit_event (SECURITY DEFINER, service_role context)
CREATE OR REPLACE FUNCTION public.emit_audit_event(
  p_actor_type text,
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_attempt_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_hash text DEFAULT NULL,
  p_user_agent_hash text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.audit_events (
    actor_type, actor_id, action, entity_type, entity_id,
    correlation_id, attempt_id, metadata, ip_hash, user_agent_hash
  ) VALUES (
    p_actor_type, p_actor_id, p_action, p_entity_type, p_entity_id,
    p_correlation_id, p_attempt_id, p_metadata, p_ip_hash, p_user_agent_hash
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 4. Increment daily metric helper
CREATE OR REPLACE FUNCTION public.increment_daily_metric(
  p_metric_name text,
  p_increment numeric DEFAULT 1,
  p_date date DEFAULT CURRENT_DATE,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  INSERT INTO public.metrics_daily (metric_date, metric_name, metric_value, metadata)
  VALUES (p_date, p_metric_name, p_increment, p_metadata)
  ON CONFLICT (metric_date, metric_name) DO UPDATE
  SET metric_value = public.metrics_daily.metric_value + p_increment,
      updated_at = pg_catalog.now();
END;
$$;

-- 5. Trigger: auto-emit audit event on user signup (profiles insert)
CREATE OR REPLACE FUNCTION public.trg_audit_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  PERFORM public.emit_audit_event(
    'candidate', NEW.user_id, 'auth.signup', 'profile', NEW.id::text,
    NULL, NULL, pg_catalog.jsonb_build_object('account_status', NEW.account_status)
  );
  PERFORM public.increment_daily_metric('auth.signup');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_user_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_user_signup();

-- 6. Trigger: audit assessment completion
CREATE OR REPLACE FUNCTION public.trg_audit_assessment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    PERFORM public.emit_audit_event(
      'candidate', NEW.user_id, 'assessment.completed', 'assessment', NEW.id::text,
      NULL, NULL, pg_catalog.jsonb_build_object('assessment_type', NEW.assessment_type, 'overall_score', NEW.overall_score)
    );
    PERFORM public.increment_daily_metric('assessment.completed');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_assessment_completed
AFTER UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_assessment_completed();

-- 7. Trigger: audit hiring goal created
CREATE OR REPLACE FUNCTION public.trg_audit_hiring_goal_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  PERFORM public.emit_audit_event(
    'business', NEW.business_id, 'business.hiring_goal_created', 'hiring_goal', NEW.id::text,
    NULL, NULL, pg_catalog.jsonb_build_object('title', NEW.title)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_hiring_goal_created
AFTER INSERT ON public.hiring_goal_drafts
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_hiring_goal_created();

-- 8. Trigger: audit candidate shortlisted
CREATE OR REPLACE FUNCTION public.trg_audit_candidate_shortlisted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  PERFORM public.emit_audit_event(
    'business', NEW.business_id, 'business.candidate_shortlisted', 'shortlist', NEW.id::text,
    NULL, NULL, pg_catalog.jsonb_build_object('candidate_profile_id', NEW.candidate_profile_id, 'hiring_goal_id', NEW.hiring_goal_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_candidate_shortlisted
AFTER INSERT ON public.business_shortlists
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_candidate_shortlisted();

-- 9. Trigger: audit profiling opt-out changed
CREATE OR REPLACE FUNCTION public.trg_audit_profiling_opt_out()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF OLD.profiling_opt_out IS DISTINCT FROM NEW.profiling_opt_out THEN
    PERFORM public.emit_audit_event(
      'candidate', NEW.user_id, 'data_rights.profiling_opt_out_changed', 'profile', NEW.id::text,
      NULL, NULL, pg_catalog.jsonb_build_object('new_value', NEW.profiling_opt_out)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_profiling_opt_out
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_profiling_opt_out();

-- 10. Trigger: audit email enqueued / status changes
CREATE OR REPLACE FUNCTION public.trg_audit_email_outbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_audit_event(
      'system', NULL, 'email.enqueued', 'email', NEW.id::text,
      NULL, NULL, pg_catalog.jsonb_build_object('email_type', NEW.email_type, 'idempotency_key', NEW.idempotency_key)
    );
    PERFORM public.increment_daily_metric('email.enqueued');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'sent' THEN
        PERFORM public.emit_audit_event('system', NULL, 'email.sent', 'email', NEW.id::text, NULL, NULL, pg_catalog.jsonb_build_object('email_type', NEW.email_type));
        PERFORM public.increment_daily_metric('email.sent');
      ELSIF NEW.status = 'failed' THEN
        PERFORM public.emit_audit_event('system', NULL, 'email.failed', 'email', NEW.id::text, NULL, NULL, pg_catalog.jsonb_build_object('email_type', NEW.email_type, 'attempt', NEW.attempts));
        PERFORM public.increment_daily_metric('email.failed');
      ELSIF NEW.status = 'dead_letter' THEN
        PERFORM public.emit_audit_event('system', NULL, 'email.dead_letter', 'email', NEW.id::text, NULL, NULL, pg_catalog.jsonb_build_object('email_type', NEW.email_type, 'error', LEFT(NEW.error_message, 100)));
        PERFORM public.increment_daily_metric('email.dead_letter');
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_email_outbox
AFTER INSERT OR UPDATE ON public.email_outbox
FOR EACH ROW
EXECUTE FUNCTION public.trg_audit_email_outbox();
