-- BATCH 1: Core utility and auth functions (10 functions)
-- Hardened SECURITY DEFINER: fixed search_path = pg_catalog, public (2026-01-27)

-- 1. has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- 2. get_profile_id_for_auth_user
CREATE OR REPLACE FUNCTION public.get_profile_id_for_auth_user(p_auth_uid uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
  SELECT id FROM public.profiles WHERE user_id = p_auth_uid LIMIT 1
$function$;

-- 3. is_thread_participant
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE thread_id = p_thread_id
      AND user_id = p_user_id
  )
$function$;

-- 4. get_feed_item_reactions
CREATE OR REPLACE FUNCTION public.get_feed_item_reactions(item_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
  SELECT COALESCE(
    jsonb_object_agg(reaction_type, count),
    '{}'::jsonb
  )
  FROM public.feed_reaction_counts
  WHERE feed_item_id = item_id;
$function$;

-- 5. log_bot_event
CREATE OR REPLACE FUNCTION public.log_bot_event(p_user uuid, p_route text, p_lang public.lang_code, p_type text, p_payload jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
  INSERT INTO public.bot_events(user_id, route, lang, event_type, payload)
  VALUES (p_user, p_route, p_lang, p_type, p_payload);
$function$;

-- 6. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, profile_complete)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    false
  );
  RETURN NEW;
END;
$function$;

-- 7. touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN 
  NEW.updated_at = pg_catalog.now(); 
  RETURN NEW; 
END; 
$function$;

-- 8. update_hiring_goal_drafts_updated_at
CREATE OR REPLACE FUNCTION public.update_hiring_goal_drafts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;

-- 9. update_user_job_links_updated_at
CREATE OR REPLACE FUNCTION public.update_user_job_links_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;

-- 10. internal_log_activity
CREATE OR REPLACE FUNCTION public.internal_log_activity(p_user_id uuid, p_action text, p_context jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, action, context)
  VALUES (p_user_id, p_action, p_context)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;