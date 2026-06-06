# Updated plan — pool invite + L1 binding hardening

Both strengthenings accepted. Trigger stays strict. Plan below replaces the prior one.

## Files touched

1. **SQL migration** — replace `public.invite_candidate_to_l1(uuid, uuid)`.
2. `src/pages/business/Candidates.tsx` — friendly gate + error handling for the new exception.
3. *(no change)* `enforce_pipeline_progression` trigger stays exactly as-is.
4. *(no change)* `GoalCandidates.tsx` already gates via `NoChallengeGate`; the RPC change makes its shortlist-card path safe too.

## 1) `invite_candidate_to_l1` — goal-scoped + mandatory L1

Confirmed current bug from `pg_get_functiondef`: the L1 resolution is
```sql
select id into v_challenge_id from public.business_challenges
 where business_id = v_business_id and level = 1 and status = 'active'
 order by created_at asc limit 1;
```
No `hiring_goal_id` filter, no NOT FOUND guard. So:
- Sarda (15 goals) inviting into goal B binds the oldest L1, which is goal A's challenge → candidate sees the wrong RAL/context.
- Fiocchi (0 L1s) binds `NULL` → candidate gets the blank legacy form.

Rewrite the resolution block (everything else in the function is fine and stays):

```sql
select id into v_challenge_id
  from public.business_challenges
 where business_id   = v_business_id
   and hiring_goal_id = p_hiring_goal_id
   and level = 1
   and status = 'active'
 order by created_at asc
 limit 1;

if v_challenge_id is null then
  raise exception 'no_xima_core_challenge'
    using hint = 'Create an active XIMA Core (Level 1) challenge for this hiring goal first.';
end if;
```

Result: every L1 invite — pool, shortlist card, any future caller — is guaranteed to bind a real, goal-scoped XIMA Core. NULL `challenge_id` becomes impossible at the data layer.

## 2) `Candidates.tsx` — friendly gate + exception handling

Pre-check before calling the RPC (so the happy path doesn't rely on catching an exception):
- Query `business_challenges` filtered by `business_id`, `level=1`, `status='active'`, joined with `hiring_goal_drafts(role_title)` to list goals that already have an L1.
- If the business has zero L1-ready goals → show inline gate ("Crea prima una sfida XIMA Core per un obiettivo di assunzione") with CTA to `/business/challenges/create-xima-core` (goal picker handled by that page) instead of the Invite button.
- If one L1-ready goal → pass its `hiring_goal_id` to the RPC.
- If multiple → small `Dialog` picker listing eligible goals; the chosen `hiring_goal_id` is passed to the RPC.

Error handling: even with the pre-check, wrap the RPC call and map `error.message === 'no_xima_core_challenge'` (or includes that token) to the same neutral toast + CTA. Other errors continue to use the existing destructive toast. No exception swallowing.

Copy stays neutral (IT), matching `NoChallengeGate`'s tone — no "pipeline", no technical terms.

## What does NOT change

- Trigger `enforce_pipeline_progression`: untouched. `pipeline_locked: Level 1 submission required` still guards L1→L2, and the L2→L3 `Proceed to Level 2` guard stays.
- `GoalCandidates.tsx`: already correct (goal-scoped query + `NoChallengeGate`). Inherits the RPC hardening for free.
- `CreateXimaCoreChallenge.tsx`, `generate-challenge`, mindset components, scoring: untouched.

## Validation

1. **Sarda, goal with L1** → pool invite resolves the L1 that belongs to *that* goal (not the oldest). Candidate opens link → mindset journey with the correct `intro_context` / RAL / blind scope. ✅
2. **Sarda, goal without an L1 yet** → RPC raises `no_xima_core_challenge` (and the UI pre-check shows the gate, so the exception is the backstop). No invitation row written. ✅
3. **Fiocchi (0 L1s)** → UI shows the gate; no RPC call. If somehow called → `no_xima_core_challenge`. ✅
4. **L1→L2 progression** without an L1 submission → trigger still raises `pipeline_locked: Level 1 submission required`. ✅
5. **Pre-existing data**: no backfill needed (no invitations currently exist with NULL `challenge_id` for either tenant; the bug manifested as the 400 error, not as orphan rows). Will verify with a `select count(*) from challenge_invitations where challenge_id is null` after the migration runs and report.

Ready to execute on your go.