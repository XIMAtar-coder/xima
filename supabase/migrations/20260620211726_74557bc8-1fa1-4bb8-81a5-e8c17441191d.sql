-- Admin SELECT policy on pillar_trajectory_log (append-only). audit_events already has one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='pillar_trajectory_log'
      AND policyname='pillar_trajectory_log admin read'
  ) THEN
    CREATE POLICY "pillar_trajectory_log admin read"
      ON public.pillar_trajectory_log
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- Add both tables to realtime publication (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pillar_trajectory_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;