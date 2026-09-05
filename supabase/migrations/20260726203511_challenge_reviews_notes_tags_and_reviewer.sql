-- challenge_reviews recorded only a decision, against a company rather than a
-- person. With more than one seat there was no way to tell who passed on a
-- candidate or why — the reasoning lived in someone's head or a side channel.
--
-- NOTE: superseded 40 minutes later by move_reviewer_notes_to_business_only_table
-- (column-level grants cannot split candidate/business visibility because both
-- share the `authenticated` role). Kept because it was applied to production.
alter table public.challenge_reviews
  add column if not exists reviewer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists notes text,
  add column if not exists tags text[] not null default '{}';

comment on column public.challenge_reviews.reviewer_user_id is
  'The person who made the call, as distinct from business_id (the company). Needed for accountability once a company has more than one seat.';
comment on column public.challenge_reviews.notes is
  'Reviewer''s own reasoning. Internal to the business — never shown to the candidate.';
comment on column public.challenge_reviews.tags is
  'Short reviewer labels for filtering and recall, e.g. strong-communicator, revisit-later.';

drop policy if exists "Candidates can view reviews of their own submissions" on public.challenge_reviews;

create policy "Candidates can view reviews of their own submissions"
on public.challenge_reviews
for select
using (
  candidate_profile_id in (
    select p.id from public.profiles p where p.user_id = (select auth.uid())
  )
);

revoke select on public.challenge_reviews from authenticated;
grant select (id, business_id, challenge_id, invitation_id, candidate_profile_id,
              decision, followup_question, created_at, updated_at)
  on public.challenge_reviews to authenticated;
grant select (reviewer_user_id, notes, tags) on public.challenge_reviews to service_role;
grant insert, update, delete on public.challenge_reviews to authenticated;
