## Approved fixes + idempotency guard

### 1. Parse fix — `supabase/functions/analyze-open-answer/index.ts` (lines 367–368)

```ts
aiRequestId = aiResp.requestId;
// extractJsonFromAiContent already returns the parsed JSON value (not a string).
const parsed = extractJsonFromAiContent(aiResp.content);
if (!parsed || typeof parsed !== 'object') {
  throw new Error('AI returned non-JSON or empty content');
}
```

Unblocks mindset + free-text + core_assessment scoring (all were silently 502-ing — acknowledged).

### 2. Route fix — `src/pages/business/Candidates.tsx`

Replace 3 occurrences (lines 138, 156, 231):
`/business/challenges/create-xima-core?goal=…` → `/business/challenges/xima-core?goal=…`

### 3. Trajectory idempotency — `analyze-open-answer/index.ts` (mindset branch, ~lines 565–594)

**Findings:** `pillar_trajectory_log` has no unique constraint. `persistTrajectoryEvent` unconditionally INSERTs a row and applies deltas to `profiles.pillar_scores`. Current mindset call passes `source_entity_id = challenge_id` — which is the *challenge* (shared across all candidates/submissions), so even keyed lookups wouldn't dedupe correctly. Re-clicking "Genera Segnali" would re-nudge.

**Guard (scoped to mindset only, signal display unaffected):**

- Change `source_entity_id` for the mindset path to `invitation_id` (truly per-submission). Free-text/L2 paths untouched.
- Before calling `persistTrajectoryEvent` in the mindset branch, query `pillar_trajectory_log` with service-role client:

```ts
if (isMindset && typeof invitation_id === 'string' && invitation_id) {
  const { data: existing } = await serviceClient
    .from('pillar_trajectory_log')
    .select('id')
    .eq('source_type', 'l1_challenge')
    .eq('source_entity_id', invitation_id)
    .eq('user_id', user_id)
    .limit(1)
    .maybeSingle();
  if (existing) {
    console.log(JSON.stringify({ type: 'trajectory_skipped_idempotent', correlation_id: correlationId, invitation_id }));
    // skip persistTrajectoryEvent — display/signals_payload still regenerates above
  } else {
    await persistTrajectoryEvent({ ..., source_entity_id: invitation_id, ... });
  }
}
```

The signals_payload upsert (lines 488–500) continues to run on every call — display is always fresh; only the pillar write is once-per-submission.

### Validation (real, not checkbox)

After deploy, invoke `analyze-open-answer` for submission `0d2859c0-1122-47a1-935f-fe6bf20fec6e` and verify:

1. `challenge_submissions.signals_payload` for invitation `f50fe834-…` contains the full rubric: `{framing, execution_bias, impact_thinking, decision_quality, overall, summary, flags, confidence, pillar_impact, pillar_reasoning, format:'mindset', ...}`.
2. The business review page (currently open at `/business/goals/bab20e13.../challenges/29fc9923.../responses`) renders the analysis (no "Genera Segnali" placeholder).
3. `pillar_trajectory_log` has **exactly one** new row with `source_type='l1_challenge'`, `source_entity_id='f50fe834-…'`, `source_function='analyze-open-answer'`.
4. Re-invoke "Genera Segnali" → signals_payload re-renders, NO second trajectory row appears (`trajectory_skipped_idempotent` log line present).
5. CTA from Pool gate on a goal with no L1 → lands on `/business/challenges/xima-core?goal=…` (no 404).

Will report `signals_payload` shape, row count in `pillar_trajectory_log` before/after both invocations, and any downstream errors that surface from code below line 368 running end-to-end for the first time.

Please switch to build mode to apply.