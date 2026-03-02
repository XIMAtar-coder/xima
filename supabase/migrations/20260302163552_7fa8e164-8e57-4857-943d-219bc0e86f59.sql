-- Step 8: Final RLS Hardening for enterprise tables

-- ai_invocation_log: admin read, service_role writes (no public policies existed)
CREATE POLICY "Admin read ai_invocation_log"
  ON public.ai_invocation_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role full access ai_invocation_log"
  ON public.ai_invocation_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure no anon access to any enterprise table
REVOKE ALL ON public.ai_invocation_log FROM anon;
REVOKE ALL ON public.assessment_evidence_ledger FROM anon;
REVOKE ALL ON public.audit_events FROM anon;
REVOKE ALL ON public.metrics_daily FROM anon;
REVOKE ALL ON public.email_outbox FROM anon;
REVOKE ALL ON public.business_entitlements FROM anon;
REVOKE ALL ON public.contact_sales_requests FROM anon;
REVOKE ALL ON public.psychometrics_telemetry FROM anon;
