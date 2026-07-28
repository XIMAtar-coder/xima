-- Candidates hold UPDATE on their own challenge_submissions row and their own
-- profiles row, with no column restriction. RLS is row-level only, so those
-- policies also permitted writing the SCORING columns:
--   challenge_submissions.signals_payload  -> feeds the 20-pt performance axis
--   profiles.pillar_scores                 -> feeds the 40-pt identity axis
-- i.e. a candidate could hand themselves ~60 of the 100 shortlist points with a
-- single PATCH using their own JWT. Scores must only ever be written by the
-- scoring pipeline, which runs with the service role.
--
-- Column-level GRANTs cannot express this (candidate and business share the
-- `authenticated` role), so it is enforced with BEFORE UPDATE triggers.

create or replace function public.guard_submission_scoring_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The scoring pipeline runs as service_role; anything else must not touch these.
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.signals_payload is distinct from old.signals_payload then
    raise exception 'signals_payload is written by the scoring pipeline and cannot be set directly'
      using errcode = '42501';
  end if;
  if new.signals_version is distinct from old.signals_version then
    raise exception 'signals_version is written by the scoring pipeline and cannot be set directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_submission_scoring on public.challenge_submissions;
create trigger guard_submission_scoring
  before update on public.challenge_submissions
  for each row execute function public.guard_submission_scoring_columns();

create or replace function public.guard_profile_scoring_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.pillar_scores is distinct from old.pillar_scores then
    raise exception 'pillar_scores is derived from assessments and cannot be set directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_scoring on public.profiles;
create trigger guard_profile_scoring
  before update on public.profiles
  for each row execute function public.guard_profile_scoring_columns();
