-- Percentile of a submission against the other candidates who answered for the
-- same hiring goal.
--
-- Deliberately returns NULL below MIN_SAMPLE. With three candidates, "top 33%"
-- is not a percentile — it is "you were first of three" wearing a statistic's
-- clothing, and it would be read as far more meaningful than it is. The callers
-- render nothing when this is null.
--
-- SECURITY DEFINER because it must read sibling submissions to rank, which the
-- caller cannot see under RLS. It therefore returns ONLY the caller's own
-- position and the sample size — never another candidate's score or identity —
-- and refuses outright unless the caller owns the submission or the goal.
create or replace function public.get_submission_percentile(p_invitation_id uuid)
returns table (percentile integer, sample_size integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
  v_overall numeric;
  v_business_id uuid;
  v_candidate_profile_id uuid;
  v_is_candidate boolean;
  v_is_business boolean;
  v_n integer;
  v_below integer;
  min_sample constant integer := 8;
begin
  select s.hiring_goal_id,
         (s.signals_payload->>'overall')::numeric,
         s.business_id,
         s.candidate_profile_id
    into v_goal_id, v_overall, v_business_id, v_candidate_profile_id
  from challenge_submissions s
  where s.invitation_id = p_invitation_id
    and s.status = 'submitted'
    and s.signals_payload ? 'overall';

  if v_goal_id is null or v_overall is null then
    return; -- not scored yet: no rows
  end if;

  -- Authorization: the candidate it belongs to, or the owning business.
  select exists (
    select 1 from profiles p
    where p.id = v_candidate_profile_id and p.user_id = (select auth.uid())
  ) into v_is_candidate;

  select is_business_owner(v_business_id) into v_is_business;

  if not (coalesce(v_is_candidate, false) or coalesce(v_is_business, false)) then
    return;
  end if;

  select count(*),
         count(*) filter (where (s2.signals_payload->>'overall')::numeric < v_overall)
    into v_n, v_below
  from challenge_submissions s2
  where s2.hiring_goal_id = v_goal_id
    and s2.status = 'submitted'
    and s2.signals_payload ? 'overall';

  if v_n < min_sample then
    return; -- too few peers for the number to mean anything
  end if;

  return query select round((v_below::numeric / v_n::numeric) * 100)::integer, v_n;
end;
$$;

revoke all on function public.get_submission_percentile(uuid) from public;
grant execute on function public.get_submission_percentile(uuid) to authenticated;

comment on function public.get_submission_percentile(uuid) is
  'Percentile of a submission within its hiring goal. Returns no rows when the caller does not own the submission, when it is unscored, or when the pool is smaller than 8 — below that a percentile is misleading rather than informative.';
