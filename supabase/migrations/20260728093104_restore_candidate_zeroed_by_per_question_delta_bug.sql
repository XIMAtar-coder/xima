-- One candidate was driven to 0 on all five pillars by a scoring defect, not by
-- their own performance: a three-question L1 challenge applied the full -5
-- per-question cap three times over (-15 per pillar) because the per-question
-- grading path had no per-challenge budget. The batch path, on the same data
-- shape, correctly applied -5 once.
--
-- The code defect is fixed (clampToChallengeBudget). This repairs the damage it
-- already did.
--
-- Reversible: the pre-repair state is preserved in scoring_repair_log below,
-- including the exact trajectory rows, so this can be undone precisely.

create table if not exists public.scoring_repair_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reason text not null,
  pillar_scores_before jsonb,
  pillar_scores_after jsonb,
  trajectory_rows_before jsonb,
  repaired_at timestamptz not null default now()
);

comment on table public.scoring_repair_log is
  'Audit of manual corrections to pillar scores. Every row records the exact prior state so a repair can be reversed. Written only by migrations, never by the application.';

alter table public.scoring_repair_log enable row level security;

-- No policies: service_role bypasses RLS, and nothing else has any business
-- reading or writing repair history.

with victim as (
  select l.user_id
  from public.pillar_trajectory_log l
  where l.source_entity_id = '15dacc6f-bd95-4e08-84ed-30166d5899e7'
  group by l.user_id
),
snapshot as (
  select
    v.user_id,
    p.pillar_scores as before_scores,
    (
      select jsonb_agg(to_jsonb(t) order by t.created_at)
      from public.pillar_trajectory_log t
      where t.user_id = v.user_id
        and t.source_entity_id = '15dacc6f-bd95-4e08-84ed-30166d5899e7'
    ) as before_rows
  from victim v
  join public.profiles p on p.user_id = v.user_id
)
insert into public.scoring_repair_log
  (user_id, reason, pillar_scores_before, pillar_scores_after, trajectory_rows_before)
select
  s.user_id,
  'Zeroed by per-question delta bug: a 3-question L1 challenge applied the -5 '
  || 'per-challenge cap once per question (-15/pillar). Reset to neutral 50 and '
  || 'the offending trajectory rows neutralised. Fixed in clampToChallengeBudget.',
  s.before_scores,
  jsonb_build_object('drive', 50, 'computational_power', 50, 'communication', 50, 'creativity', 50, 'knowledge', 50),
  s.before_rows
from snapshot s;

-- Neutralise the three bogus rows rather than deleting them: the grading record
-- of what the model said stays intact and auditable, but the deltas no longer
-- claim to have moved anything.
update public.pillar_trajectory_log
set drive_delta = 0,
    computational_power_delta = 0,
    communication_delta = 0,
    creativity_delta = 0,
    knowledge_delta = 0,
    reasoning = 'VOIDED BY REPAIR — deltas nullified. This challenge was graded '
      || 'per question, applying the per-challenge cap once per question. Original '
      || 'reasoning and scores preserved in scoring_repair_log. ' || coalesce(reasoning, '')
where source_entity_id = '15dacc6f-bd95-4e08-84ed-30166d5899e7';

-- Reset to the neutral midpoint, which is what "not yet meaningfully assessed"
-- looks like. Not an estimate of ability: this candidate's only submission was
-- junk text, so there is no assessed baseline to restore, and 50 makes no claim
-- either way.
update public.profiles p
set pillar_scores = jsonb_build_object(
      'drive', 50, 'computational_power', 50, 'communication', 50, 'creativity', 50, 'knowledge', 50
    ),
    updated_at = now()
from public.scoring_repair_log r
where r.user_id = p.user_id
  and r.reason like 'Zeroed by per-question delta bug%';
