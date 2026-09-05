-- Account deletion left data behind, and could fail outright.
--
-- delete-account calls delete_user_account() and then auth.admin.deleteUser(),
-- so most user-linked tables are cleared by ON DELETE CASCADE. Two groups were
-- not: eight FK-less tables keyed by NOT NULL candidate_profile_id / user_id
-- (rows survived), and two NO ACTION FKs (entitlement_events, mentor_credits)
-- that made the auth delete raise after the profile was already gone.
-- entitlement_events is an audit trail: kept and de-linked. mentor_credits is
-- the user's own balance: cascades.

alter table public.entitlement_events alter column user_id drop not null;
alter table public.entitlement_events drop constraint if exists entitlement_events_user_id_fkey;
alter table public.entitlement_events
  add constraint entitlement_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.mentor_credits drop constraint if exists mentor_credits_user_id_fkey;
alter table public.mentor_credits
  add constraint mentor_credits_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create or replace function public.delete_user_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  calling_user_id uuid;
  is_admin boolean;
  v_profile_ids uuid[];
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  SELECT public.has_role(calling_user_id, 'admin') INTO is_admin;
  IF calling_user_id != p_user_id AND NOT COALESCE(is_admin, false) THEN
    RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO v_profile_ids FROM public.profiles WHERE user_id = p_user_id;

  UPDATE public.chat_messages SET sender_id = NULL, body = '[deleted]' WHERE sender_id = ANY(v_profile_ids);
  UPDATE public.activity_logs SET user_id = NULL, context = pg_catalog.jsonb_build_object('anonymized', true) WHERE user_id = p_user_id;
  UPDATE public.challenge_submissions SET submitted_payload = pg_catalog.jsonb_build_object('anonymized', true) WHERE candidate_profile_id = ANY(v_profile_ids);

  -- Tables with no foreign key to the person (audit X-08).
  DELETE FROM public.challenge_followups        WHERE candidate_profile_id = ANY(v_profile_ids);
  DELETE FROM public.challenge_reviews          WHERE candidate_profile_id = ANY(v_profile_ids);
  DELETE FROM public.challenge_invitations      WHERE candidate_profile_id = ANY(v_profile_ids);
  DELETE FROM public.business_shortlists        WHERE candidate_profile_id = ANY(v_profile_ids);
  DELETE FROM public.mentor_access_audit_logs   WHERE candidate_profile_id = ANY(v_profile_ids);
  DELETE FROM public.email_verification_tokens  WHERE user_id = p_user_id;
  DELETE FROM public.saved_opportunities        WHERE user_id = p_user_id;
  DELETE FROM public.user_job_links             WHERE user_id = p_user_id;

  DELETE FROM public.feed_consumption WHERE profile_id = ANY(v_profile_ids);
  DELETE FROM public.feed_seen_items WHERE profile_id = ANY(v_profile_ids);
  DELETE FROM public.chat_participants WHERE user_id = ANY(v_profile_ids);
  DELETE FROM public.ai_conversations WHERE user_id = p_user_id;
  DELETE FROM public.cv_uploads WHERE user_id = p_user_id;
  DELETE FROM public.assessment_results WHERE user_id = p_user_id;
  DELETE FROM public.user_consents WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;

  RETURN pg_catalog.jsonb_build_object('success', true, 'message', 'Account data deleted');
END;
$$;
