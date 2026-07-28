-- The previous version of these guards was SECURITY DEFINER, which sets
-- current_user to the function OWNER (postgres) rather than the caller — so the
-- "is this the service role?" check was always true and the guard never fired.
-- Verified by simulating a real candidate: the update succeeded.
--
-- These need INVOKER rights (the default) precisely so current_user reflects
-- whoever is actually performing the UPDATE.

create or replace function public.guard_submission_scoring_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
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

create or replace function public.guard_profile_scoring_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.pillar_scores is distinct from old.pillar_scores then
    raise exception 'pillar_scores is derived from assessments and cannot be set directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
