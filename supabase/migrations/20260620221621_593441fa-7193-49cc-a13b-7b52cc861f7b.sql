
CREATE TABLE public.xima_request_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table text NOT NULL CHECK (source_table IN ('hiring_goal_drafts','job_posts','contact_sales_requests')),
  source_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','dismissed')),
  handled_by uuid,
  handled_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id)
);

GRANT ALL ON public.xima_request_actions TO service_role;

ALTER TABLE public.xima_request_actions ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated. Access only via admin-gated edge functions (service_role).
-- Admins can read via service-role edges; we also allow direct read for admins for convenience.
CREATE POLICY "Admins can read xima_request_actions"
  ON public.xima_request_actions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_xima_request_actions_source ON public.xima_request_actions(source_table, source_id);
CREATE INDEX idx_xima_request_actions_status ON public.xima_request_actions(status);

CREATE TRIGGER update_xima_request_actions_updated_at
  BEFORE UPDATE ON public.xima_request_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
