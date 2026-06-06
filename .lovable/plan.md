# L1→L2 Pipeline Fix — Verified Values + Submission-Gated Atomic Landing

## Value verification (what saveReview & the L2 upsert actually SET)

Traced every field through the call chain (not assumed):

**SubmissionDetailDrawer.saveReview** (`src/components/business/SubmissionDetailDrawer.tsx`) inserts:

| Field | Source | Value for Fiocchi / candidate `5218a7a2-…` |
|---|---|---|
| `business_id` | prop `businessId` | `ChallengeResponses.tsx:701` → `userId` → `supabase.auth.getUser().id` = **`auth.uid()` = `6217364b-…`** ✓ satisfies `is_business_owner(business_id)` |
| `challenge_id` | prop `challengeId` | URL param, validated against `business_challenges` at line 103 → `29fc9923-…` ✓ |
| `invitation_id` | `submission.invitationId` | `useChallengeResponsesData.ts:171` ← `inv.id` → `f50fe834-…` ✓ |
| `candidate_profile_id` | `submission.candidateProfileId` | `useChallengeResponsesData.ts:172` ← `inv.candidate_profile_id` → `5218a7a2-…` ✓ |
| `decision` | literal | `'proceed_level2'` ✓ |
| `followup_question` | literal | `null` (nullable) ✓ |

All four required columns are populated, `business_id` IS `auth.uid()` (not a profile.id, not a goal field), and RLS would permit. Live postgres ERROR scan shows no `challenge_reviews` insert failures in recent windows. With 0 rows in the table, the only consistent explanation is that `saveReview` discards the `{ error }` Supabase-js returns instead of throwing — the modal advances on success-looking state regardless. Both the swallow and the missing landing guarantee at L2-invite time are fixed below.

## Fixes (single pass)

### A. `src/components/business/SubmissionDetailDrawer.tsx` — surface errors and gate modal opening
- In `saveReview`, destructure `{ error }` from BOTH the UPDATE and the INSERT and `throw error` if present (the existing `catch` then fires a destructive toast).
- Move the optimistic `setCurrentReview({ id: 'temp', … })` to AFTER `await`, gated on success.
- In the proceed button onClick, wrap `saveReview('proceed_level2')` in try/catch and only call `setLevel2ModalOpen(true)` when it resolves cleanly.

### B. `src/components/business/Level2InviteModal.tsx` — submission-gated atomic upsert BEFORE the L2 invite insert
In `sendInvitation`, immediately before the duplicate-invitation check, resolve the candidate's L1 invitation AND verify a submitted L1 submission exists. Only then upsert the review:

```ts
// 1. Find this candidate's L1 (XIMA Core) challenge for this goal
const { data: l1Challenge } = await supabase
  .from('business_challenges')
  .select('id')
  .eq('hiring_goal_id', hiringGoalId)
  .eq('business_id', businessId)
  .or('rubric->>type.eq.xima_core,rubric->>isXimaCore.eq.true,rubric->>level.eq.1')
  .in('status', ['active', 'published'])
  .maybeSingle();

// 2. Find this candidate's invitation to that L1, JOINED with a submitted submission.
//    Only proceed if L1 was actually SUBMITTED (not just invited).
const { data: l1Inv } = l1Challenge ? await supabase
  .from('challenge_invitations')
  .select('id, challenge_submissions!inner(id, status)')
  .eq('business_id', businessId)
  .eq('hiring_goal_id', hiringGoalId)
  .eq('candidate_profile_id', candidateProfileId)
  .eq('challenge_id', l1Challenge.id)
  .eq('challenge_submissions.status', 'submitted')
  .maybeSingle() : { data: null };

// 3. Upsert the proceed_level2 review only when L1 is genuinely submitted.
//    If not submitted, skip — Gate A will (correctly) reject the L2 invite below.
if (l1Challenge && l1Inv) {
  const { error: reviewErr } = await supabase
    .from('challenge_reviews')
    .upsert({
      business_id: businessId,            // = auth.uid() (verified above)
      challenge_id: l1Challenge.id,
      invitation_id: l1Inv.id,
      candidate_profile_id: candidateProfileId,
      decision: 'proceed_level2',
    }, { onConflict: 'invitation_id' });
  if (reviewErr) {
    console.error('proceed_level2 review upsert failed', reviewErr);
    toast({
      title: t('business.level2.review_failed'),
      description: reviewErr.message,
      variant: 'destructive',
    });
    return;
  }
}
// else: do NOT pre-write a review the candidate hasn't earned.
// Gate A enforces "L1 submission required"; the toast mapping in (C) surfaces it.
```

Then run the existing `challenge_invitations` insert. Behavior matrix:

| L1 state for this candidate | Review upsert | L2 invite insert | Outcome |
|---|---|---|---|
| Submitted | ✅ lands `proceed_level2` | ✅ Gate A + B pass | L2 sent |
| Invited, not submitted | ⏭ skipped (no row written) | ❌ Gate A blocks: `pipeline_locked: Level 1 submission required` | Toast shown, no spurious review |
| No L1 invitation | ⏭ skipped | ❌ Gate A blocks | Toast shown |

This keeps Gate A and Gate B consistent: a future fresh L1 submission by the same candidate will still require an explicit human "Procedi allo Step Successivo" click before another L2 attempt can pass Gate B.

### C. Error mapping + badge (carry over)
- Map `pipeline_locked: Level 1 submission required` → "Il candidato non ha ancora completato la XIMA Core."
- Map `pipeline_locked: Business must select Proceed to Level 2` → defensive toast (should be unreachable after B for submitted candidates).
- Candidate-row "L1 in attesa di revisione" badge remains.

## Validation — row landing, not just toasts

1. Pre-state: `SELECT count(*) FROM challenge_reviews WHERE invitation_id='f50fe834-0923-40f6-a1eb-767e3872f3da'` → 0.
2. As Fiocchi, open candidate `5218a7a2-…` → "Crea e Invia Invito" on an L2 template.
3. Post-state (live query):
   - `SELECT id, business_id, challenge_id, invitation_id, candidate_profile_id, decision FROM challenge_reviews WHERE invitation_id='f50fe834-…'` → **exactly one row**, `decision='proceed_level2'`, `business_id=6217364b-…`, `challenge_id=29fc9923-…`, `candidate_profile_id=5218a7a2-…`.
   - New L2 row in `challenge_invitations` for `(candidate_profile_id, hiring_goal_id, new_challenge_id)`. No `pipeline_locked`.
4. Idempotency: retry "Crea e Invia Invito" with a different L2 template → still exactly 1 row in `challenge_reviews` for `f50fe834-…` (upsert on `invitation_id`).
5. Negative test — invited-but-not-submitted: candidate X with L1 invitation but `challenge_submissions.status != 'submitted'`. Click L2 invite → review upsert is SKIPPED (no row written), `challenge_invitations` insert fails Gate A with `pipeline_locked: Level 1 submission required`, toast shown. **No advancement decision is recorded.** When X later submits L1, a fresh "Procedi allo Step Successivo" click is still required before any L2 invite can succeed.
6. Negative test — no L1 at all: same outcome as (5).
7. Swallow regression test: force a transient bad value in dev → destructive toast fires, level2 modal stays closed.

Success criterion is the row landing in step 3 (or its absence in steps 5–6), NOT a toast.

## Files
- `src/components/business/SubmissionDetailDrawer.tsx`
- `src/components/business/Level2InviteModal.tsx`
- `src/i18n/locales/{it,en,es}.json` — add `business.level2.review_failed`, `business.level2.pipeline_locked`, `business.level2.pipeline_locked_desc` if missing

No trigger, RLS, or schema changes. The lock holds for every candidate without a submitted L1.

Awaiting approval to switch to build mode.
