-- Audit trigger for L3 video submissions
CREATE OR REPLACE FUNCTION public.trg_audit_l3_video_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  challenge_rubric JSONB;
BEGIN
  IF NEW.status = 'submitted' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'submitted') THEN
    SELECT rubric INTO challenge_rubric
    FROM public.business_challenges WHERE id = NEW.challenge_id;

    IF challenge_rubric->>'type' IN ('standing_presence', 'video') OR (challenge_rubric->>'level')::int = 3 THEN
      PERFORM public.emit_audit_event(
        'candidate', NEW.candidate_profile_id, 'l3.video_uploaded', 'challenge_submission', NEW.id::text,
        NULL, NULL, pg_catalog.jsonb_build_object(
          'challenge_id', NEW.challenge_id,
          'invitation_id', NEW.invitation_id,
          'business_id', NEW.business_id
        )
      );
      PERFORM public.increment_daily_metric('l3.video_uploaded');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_l3_video_submitted ON public.challenge_submissions;
CREATE TRIGGER trg_audit_l3_video_submitted
  AFTER INSERT OR UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_l3_video_submitted();

COMMENT ON TABLE public.challenge_submissions IS 'Challenge submissions including L3 video. Video files in challenge-videos bucket follow GDPR deletion via delete-account edge function. Retention: files deleted on account deletion; data anonymized per delete_user_account RPC.';