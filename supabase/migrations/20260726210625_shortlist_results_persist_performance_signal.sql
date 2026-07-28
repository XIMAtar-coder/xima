-- The demonstrated-performance signal (0-20, from actual challenge scores) was
-- computed and returned in the API response but never stored, so the persisted
-- shortlist could not explain the ranking it recorded. Without this, a decision
-- cannot be reconstructed after the fact — which is the whole point of keeping
-- the row.
alter table public.shortlist_results
  add column if not exists performance_score numeric(5,2),
  add column if not exists performance_summary text;

comment on column public.shortlist_results.performance_score is
  'Demonstrated performance in challenges (0-20). The axis the ranking previously ignored entirely while counting platform activity.';
comment on column public.shortlist_results.performance_summary is
  'Human-readable basis for performance_score, e.g. "3 challenges, avg 72".';
