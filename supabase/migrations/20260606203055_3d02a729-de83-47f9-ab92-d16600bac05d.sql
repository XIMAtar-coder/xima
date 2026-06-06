CREATE OR REPLACE FUNCTION public.invite_candidate_to_l1(p_candidate_user_id uuid, p_hiring_goal_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_id   uuid := auth.uid();
  v_profile_id    uuid;
  v_challenge_id  uuid;
  v_anon_label    text;
  v_invitation_id uuid;
begin
  if v_business_id is null then raise exception 'Not authenticated'; end if;

  -- the goal must belong to the calling business
  if not exists (select 1 from public.hiring_goal_drafts g
                 where g.id = p_hiring_goal_id and g.business_id = v_business_id) then
    raise exception 'Hiring goal does not belong to this business';
  end if;

  -- resolve candidate profile id (business can't read profiles under RLS)
  select id into v_profile_id from public.profiles where user_id = p_candidate_user_id;
  if v_profile_id is null then raise exception 'Candidate profile not found'; end if;

  -- one L1 invite per candidate per goal
  if exists (select 1 from public.challenge_invitations ci
             where ci.business_id = v_business_id
               and ci.hiring_goal_id = p_hiring_goal_id
               and ci.candidate_profile_id = v_profile_id) then
    raise exception 'Candidate already invited for this goal';
  end if;

  -- Goal-scoped active L1 (XIMA Core) challenge for THIS hiring goal.
  -- Every L1 invite must bind a real challenge belonging to the selected goal,
  -- so the candidate sees the correct context / RAL / blind scope.
  select id into v_challenge_id
    from public.business_challenges
   where business_id    = v_business_id
     and hiring_goal_id = p_hiring_goal_id
     and level  = 1
     and status = 'active'
   order by created_at asc
   limit 1;

  if v_challenge_id is null then
    raise exception 'no_xima_core_challenge'
      using hint = 'Create an active XIMA Core (Level 1) challenge for this hiring goal first.';
  end if;

  -- reuse the anonymous label from the shortlist if present
  select anonymous_label into v_anon_label from public.shortlist_results
   where business_id = v_business_id and candidate_user_id = p_candidate_user_id
   order by created_at desc limit 1;

  insert into public.challenge_invitations
    (business_id, hiring_goal_id, candidate_profile_id, challenge_id,
     status, invite_token, sent_via, anonymous_label)
  values
    (v_business_id, p_hiring_goal_id, v_profile_id, v_challenge_id,
     'invited', gen_random_uuid(), array['in_app']::text[], v_anon_label)
  returning id into v_invitation_id;

  return v_invitation_id;
end
$function$;