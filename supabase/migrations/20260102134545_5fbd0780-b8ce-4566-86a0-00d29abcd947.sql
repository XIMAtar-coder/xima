-- Fix remaining functions missing search_path

-- notify_new_challenge
CREATE OR REPLACE FUNCTION public.notify_new_challenge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    -- Only notify if challenge is public
    IF NEW.is_public THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
        SELECT 
            p.user_id, 
            NEW.business_id, 
            'challenge', 
            NEW.id,
            'New Challenge: ' || NEW.title,
            'A new challenge from ' || COALESCE(bp.company_name, 'a company') || ' matches your XIMA profile.'
        FROM profiles p
        LEFT JOIN business_profiles bp ON bp.user_id = NEW.business_id
        WHERE p.user_id != NEW.business_id
          AND p.profile_complete = true
        LIMIT 50;
    END IF;
    RETURN NEW;
END;
$function$;

-- notify_new_job
CREATE OR REPLACE FUNCTION public.notify_new_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    -- Only notify if job is public
    IF NEW.is_public THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
        SELECT 
            p.user_id, 
            auth.uid(), 
            'job_offer', 
            NEW.id,
            'New Job Offer: ' || NEW.title,
            'A new opportunity at ' || NEW.company || ' is now available.'
        FROM profiles p
        WHERE p.profile_complete = true
        LIMIT 50;
    END IF;
    RETURN NEW;
END;
$function$;