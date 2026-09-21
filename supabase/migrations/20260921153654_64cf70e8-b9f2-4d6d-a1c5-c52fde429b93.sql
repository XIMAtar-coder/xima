CREATE OR REPLACE FUNCTION public.guard_profile_scoring_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.pillar_scores is distinct from old.pillar_scores then
    raise exception 'pillar_scores is derived from assessments and cannot be set directly'
      using errcode = '42501';
  end if;

  -- Billing / entitlement columns: service role only
  if new.membership_tier is distinct from old.membership_tier
     or new.membership_renewal_at is distinct from old.membership_renewal_at
     or new.free_intro_session_used_at is distinct from old.free_intro_session_used_at
     or new.free_mentor_session_used is distinct from old.free_mentor_session_used
     or new.subscriber_no is distinct from old.subscriber_no
     or new.referral_code is distinct from old.referral_code then
    raise exception 'membership and entitlement fields cannot be modified directly'
      using errcode = '42501';
  end if;

  -- Account status / verification columns: service role only
  if new.account_status is distinct from old.account_status
     or new.email_verified_at is distinct from old.email_verified_at
     or new.verification_required_until is distinct from old.verification_required_until then
    raise exception 'account status and verification fields cannot be modified directly'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;