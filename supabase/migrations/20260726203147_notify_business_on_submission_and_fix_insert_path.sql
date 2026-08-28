-- Two defects in notify_challenge_submission:
--   1. It notified only the candidate. The reviewing business was never told a
--      submission had arrived — the worst step in the funnel, because nobody
--      knew anything had happened and the reviewer had to remember to look.
--   2. It was AFTER UPDATE only, so submissions created directly as 'submitted'
--      (the insert path) never notified anyone at all.
--
-- NOTE (added retrospectively, 2026-08-28): this migration introduced the
-- 'submission_to_review' notification type WITHOUT adding it to
-- notifications_type_check, so the INSERT below raised 23514 inside an AFTER
-- trigger and aborted every candidate's submission. Fixed in
-- 20260828000000_allow_notification_types_the_app_actually_emits.sql. Recovering
-- this file into the repo late is why that went unreviewed: it was applied
-- through the management API and never committed.

create or replace function public.notify_challenge_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_user_id uuid;
  challenge_title text;
  company_name text;
  candidate_label text;
begin
  -- Fire on a genuine transition into 'submitted', on INSERT or UPDATE.
  if new.status = 'submitted'
     and (tg_op = 'INSERT' or old.status is null or old.status <> 'submitted') then

    select p.user_id into candidate_user_id
    from public.profiles p where p.id = new.candidate_profile_id;

    select bc.title into challenge_title
    from public.business_challenges bc where bc.id = new.challenge_id;

    select bp.company_name into company_name
    from public.business_profiles bp where bp.user_id = new.business_id;

    -- Candidates stay pseudonymous to the business until identity is revealed,
    -- so the business-facing notification must not carry a real name.
    select coalesce(i.anonymous_label, 'A candidate') into candidate_label
    from public.challenge_invitations i where i.id = new.invitation_id;

    -- Candidate: confirmation that it landed.
    if candidate_user_id is not null then
      insert into public.notifications (recipient_id, sender_id, type, related_id, title, message)
      values (
        candidate_user_id,
        new.business_id,
        'submission_received',
        new.invitation_id,
        'Submission received',
        'Your response to "' || coalesce(challenge_title, 'Challenge') || '" for '
          || coalesce(company_name, 'the company') || ' is now awaiting review.'
      );
    end if;

    -- Business: a response is waiting. This is the notification that did not exist.
    if new.business_id is not null then
      insert into public.notifications (recipient_id, sender_id, type, related_id, title, message)
      values (
        new.business_id,
        new.business_id,
        'submission_to_review',
        new.challenge_id,
        'New response to review',
        coalesce(candidate_label, 'A candidate') || ' responded to "'
          || coalesce(challenge_title, 'your challenge') || '".'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_on_submission on public.challenge_submissions;
create trigger notify_on_submission
  after insert or update on public.challenge_submissions
  for each row execute function public.notify_challenge_submission();
