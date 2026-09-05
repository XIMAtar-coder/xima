-- Correcting the previous migration. Column-level grants cannot express
-- "candidates see the decision, the business also sees the notes", because both
-- are the same `authenticated` role — the grant applied to everyone and left the
-- business able to write notes it could not read back.
--
-- Internal reviewer data therefore lives in its own table, gated by RLS to the
-- owning business, while challenge_reviews stays readable as before (the
-- candidate legitimately sees the decision about them and any follow-up).

-- 1. Restore normal table-level access on challenge_reviews.
grant select on public.challenge_reviews to authenticated;

-- 2. Drop the internal columns added to the wrong table.
alter table public.challenge_reviews
  drop column if exists reviewer_user_id,
  drop column if exists notes,
  drop column if exists tags;

-- 3. Internal, business-only reviewer record.
create table if not exists public.challenge_review_notes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.challenge_reviews(id) on delete cascade,
  business_id uuid not null,
  -- The person who made the call, as distinct from the company.
  reviewer_user_id uuid references auth.users(id) on delete set null,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id)
);

comment on table public.challenge_review_notes is
  'Internal hiring notes, tags and reviewer attribution for a challenge review. Never visible to the candidate — separated from challenge_reviews precisely because that row IS candidate-visible.';

create index if not exists idx_challenge_review_notes_business
  on public.challenge_review_notes (business_id);

alter table public.challenge_review_notes enable row level security;

create policy "Business users manage their own review notes"
on public.challenge_review_notes
for all
using (is_business_owner(business_id))
with check (is_business_owner(business_id));
