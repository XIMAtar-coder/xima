-- BATCH 2: Logging and notification functions (10 functions)
-- Hardened SECURITY DEFINER: fixed search_path = pg_catalog, public (2026-01-27)

-- 11. log_user_activity
CREATE OR REPLACE FUNCTION public.log_user_activity(p_action text, p_context jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  log_id UUID;
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to log activity';
  END IF;

  INSERT INTO public.activity_logs (user_id, action, context)
  VALUES (calling_user_id, p_action, p_context)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

-- 12. log_challenge_participation
CREATE OR REPLACE FUNCTION public.log_challenge_participation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  PERFORM public.internal_log_activity(
    NEW.candidate_id,
    'challenge_joined',
    pg_catalog.jsonb_build_object('challenge_id', NEW.challenge_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$function$;

-- 13. log_job_application
CREATE OR REPLACE FUNCTION public.log_job_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.status = 'applied' AND (OLD.status IS NULL OR OLD.status != 'applied') THEN
    PERFORM public.internal_log_activity(
      NEW.user_id,
      'job_application',
      pg_catalog.jsonb_build_object('job_id', NEW.job_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 14. assign_role_to_user
CREATE OR REPLACE FUNCTION public.assign_role_to_user(target_user_id uuid, target_role public.app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

-- 15. get_admin_stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT pg_catalog.json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'active_users_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= pg_catalog.now() - INTERVAL '7 days'),
    'total_assessments', (SELECT COUNT(*) FROM public.assessment_results),
    'avg_score', (SELECT pg_catalog.ROUND(AVG(total_score), 2) FROM public.assessment_results),
    'most_common_ximatar', (
      SELECT label 
      FROM public.ximatars 
      WHERE id = (
        SELECT ximatar_id 
        FROM public.assessment_results 
        GROUP BY ximatar_id 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
      )
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- 16. notify_challenge_invitation
CREATE OR REPLACE FUNCTION public.notify_challenge_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  recipient_auth_uid UUID;
  company_name_val TEXT;
  role_title_val TEXT;
  challenge_title_val TEXT;
BEGIN
  SELECT user_id INTO recipient_auth_uid
  FROM public.profiles
  WHERE id = NEW.candidate_profile_id;

  SELECT company_name INTO company_name_val
  FROM public.business_profiles
  WHERE user_id = NEW.business_id;

  SELECT role_title INTO role_title_val
  FROM public.hiring_goal_drafts
  WHERE id = NEW.hiring_goal_id;

  IF NEW.challenge_id IS NOT NULL THEN
    SELECT title INTO challenge_title_val
    FROM public.business_challenges
    WHERE id = NEW.challenge_id;
  END IF;

  IF recipient_auth_uid IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id, sender_id, type, related_id, title, message
    ) VALUES (
      recipient_auth_uid,
      NEW.business_id,
      'challenge_invitation',
      NEW.id,
      COALESCE('Challenge Invitation from ' || company_name_val, 'New Challenge Invitation'),
      COALESCE(
        'You have been invited to complete a challenge for the ' || role_title_val || ' role.',
        'You have been invited to complete a challenge.'
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 17. notify_challenge_submission
CREATE OR REPLACE FUNCTION public.notify_challenge_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  candidate_user_id UUID;
  challenge_title TEXT;
  company_name TEXT;
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    SELECT p.user_id INTO candidate_user_id
    FROM public.profiles p
    WHERE p.id = NEW.candidate_profile_id;
    
    SELECT bc.title INTO challenge_title
    FROM public.business_challenges bc
    WHERE bc.id = NEW.challenge_id;
    
    SELECT bp.company_name INTO company_name
    FROM public.business_profiles bp
    WHERE bp.user_id = NEW.business_id;
    
    IF candidate_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
      VALUES (
        candidate_user_id,
        NEW.business_id,
        'submission_received',
        NEW.invitation_id,
        'Submission Received',
        'Your response to "' || COALESCE(challenge_title, 'Challenge') || '" for ' || COALESCE(company_name, 'Company') || ' is now awaiting review.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 18. notify_review_decision
CREATE OR REPLACE FUNCTION public.notify_review_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  candidate_user_id UUID;
  challenge_title TEXT;
  company_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
BEGIN
  SELECT p.user_id INTO candidate_user_id
  FROM public.challenge_invitations ci
  JOIN public.profiles p ON p.id = ci.candidate_profile_id
  WHERE ci.id = NEW.invitation_id;
  
  SELECT bc.title INTO challenge_title
  FROM public.business_challenges bc
  WHERE bc.id = NEW.challenge_id;
  
  SELECT bp.company_name INTO company_name
  FROM public.business_profiles bp
  WHERE bp.user_id = NEW.business_id;
  
  CASE NEW.decision
    WHEN 'shortlist' THEN
      notif_type := 'shortlisted';
      notif_title := 'You''ve been shortlisted! 🎉';
      notif_message := COALESCE(company_name, 'A company') || ' has shortlisted you for their role.';
    WHEN 'followup' THEN
      notif_type := 'followup_requested';
      notif_title := 'Follow-up Question Requested';
      notif_message := COALESCE(company_name, 'A company') || ' has a follow-up question about your submission.';
    WHEN 'pass' THEN
      notif_type := 'passed';
      notif_title := 'Application Update';
      notif_message := 'You were not selected for the ' || COALESCE(challenge_title, 'role') || ' at ' || COALESCE(company_name, 'this company') || '. Keep going!';
    WHEN 'proceed_level2' THEN
      notif_type := 'advanced_level2';
      notif_title := 'You advanced to Level 2! 🚀';
      notif_message := COALESCE(company_name, 'A company') || ' has invited you to their role-specific challenge.';
    ELSE
      RETURN NEW;
  END CASE;
  
  IF candidate_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
    VALUES (candidate_user_id, NEW.business_id, notif_type, NEW.invitation_id, notif_title, notif_message);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 19. notify_new_challenge
CREATE OR REPLACE FUNCTION public.notify_new_challenge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;

-- 20. notify_new_job
CREATE OR REPLACE FUNCTION public.notify_new_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;