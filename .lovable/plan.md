# Trace report: archetype not persisted to profiles

Reporting findings only. No code changes yet.

## 1. Where the persistence write lives

There is **no edge function** writing the archetype. There are two client paths plus one DB trigger:

- **Guest path** (assessment before account exists) — `src/components/ximatar-journey/XimatarAssessment.tsx` lines 176–272. Computes `mockPillarScores` and `ximatarLabel` locally and stores them in **sessionStorage** under keys `guest_pillar_scores`, `guest_ximatar`, `guest_ximatar_name`, `guest_drive_level`, `guest_strongest_pillar`, `guest_weakest_pillar`, `guest_ximatar_storytelling`, `guest_ximatar_growth_path`. No DB write here.
- **Sync after sign-up** — `src/utils/assessmentSync.ts` `syncGuestAssessmentToProfile(userId)`. Called from `src/pages/Register.tsx:147` (after `signUp`) and `src/pages/AuthCallback.tsx:50,81` (Google OAuth). This is the only place that writes `profiles.pillar_scores`, `profiles.ximatar`, `profiles.ximatar_id`, `profiles.ximatar_assigned_at`, `profiles.ximatar_name`, `profiles.drive_level`, `profiles.profile_complete=true`, `profiles.creation_source='assessment'` — all inside one `.update(profileUpdate).eq('user_id', userId)` call at lines 193–196.
- **Logged-in path** (assessment after account exists) — `XimatarAssessment.tsx` lines 275–454. Inserts `assessment_results` (completed=false), inserts `assessment_answers`, then updates `assessment_results.completed=true`. Relies on the DB trigger `trg_assessment_completed → on_assessment_completed_trigger → compute_pillar_scores_from_assessment + assign_ximatar_by_pillars` to fill `assessment_results.pillars` and `ximatar_id`, then `trg_sync_assessment → sync_assessment_to_profile` to copy them onto `profiles`. This path **never writes `profiles.ximatar`, `ximatar_name`, `ximatar_assigned_at`, `drive_level`, or `profile_complete`** — `sync_assessment_to_profile` only copies `pillar_scores` and `ximatar_id`.

## 2. What the two broken June-5 users actually look like in the DB

`ecae1787-…` and `fa00ec30-…`:

- `profiles`: `ximatar=null`, `ximatar_assigned_at=null`, `pillar_scores={}`, `profile_complete=false`, `creation_source='assessment'`, `verification_required_until` = `created_at + 48h`, `updated_at` exactly equals the assessment_results `computed_at` (microsecond match).
- `assessment_results`: 1 row, `completed=true`, `computed_at` set (column default `now()`), `total_score` = 32.72 / 37.53 (≈ sum of 5 pillar scores), `attempt_id=null`, `field_key=null`, `pillars=null`, `ximatar_id=null`.
- `assessment_answers`: **0 rows** for these result ids.
- `pillar_scores` (the table): **0 rows** for these result ids.

Last user who persisted correctly (89545475-…, June 4 22:08) has `ximatar='horse'`, full `pillar_scores`, `profile_complete=true`, `creation_source='assessment'`.

## 3. What the data proves about which branches ran

- `verification_required_until = created_at + 48h` proves the `profiles.update({ verification_required_until, email_verified_at: null })` at `Register.tsx:124-127` ran → so the user got a session and made it past `signUp`. (`handle_new_user` sets the column to `+24h`; only the client write sets `+48h`.)
- `creation_source='assessment'` is the **column default** (`'assessment'::text`), so it does NOT prove that `assessmentSync`'s profile UPDATE ran.
- `pillar_scores={}` is also the column default (`'{}'::jsonb`).
- `profile_complete=false` is the column default.
- `assessment_results` row exists with `total_score≈32` and `field_key=null, attempt_id=null` — that exactly matches the **sync-path INSERT** at `assessmentSync.ts:85-95` (the logged-in path always sets `field_key` and `attempt_id`). So sync ran far enough to insert `assessment_results`, which means the supabase client had a valid session at that moment (RLS on `assessment_results` requires `auth.uid() = user_id` for INSERT, and the row exists).
- `assessment_results.pillars=null, ximatar_id=null` because `on_assessment_completed_trigger` short-circuits with `IF answer_count = 0 THEN RETURN NEW` — sync never inserts `assessment_answers`, so server-side computation is a no-op. (This is by design for the sync path; the trigger is intended for the logged-in path.) Consequence: `sync_assessment_to_profile`'s `COALESCE(NEW.pillars, pillar_scores)` does nothing.
- `profiles.updated_at` matches `assessment_results.computed_at` to the microsecond — this is the timestamp from `sync_assessment_to_profile`'s `updated_at = now()` fired by the sync's `assessment_results` INSERT. If the sync's profile `UPDATE` at `assessmentSync.ts:193-196` had run, `updated_at` would have been bumped to a later timestamp.
- The `pillar_scores` table insert at `assessmentSync.ts:111-113` silently failed: `pillar_scores` has **only SELECT RLS policies, no INSERT policy**, so authenticated client INSERTs are rejected. The error is logged but execution continues. Not the cause of the profile bug, but confirms `error`-only checks aren't enough.

**Conclusion for each of your four checks:**

1. **Is the write invoked on completion?** Yes for the assessment_results INSERT (lines 85–95). **No** for the profile UPDATE (lines 193–196) — it never executed for these users.
2. **Is the update awaited and the error / row count checked?** It is awaited and `error` is checked, but **row count is not**. An `UPDATE … .eq('user_id', userId)` that hits 0 rows (RLS mismatch, or row not yet visible to this session) returns `{ error: null, data: null }` and logs `'✅ Successfully updated profile…'`. This is a real footgun, but for these specific users it is not what fired — the UPDATE block was skipped entirely (next point).
3. **Does it run after the session is established?** Yes for the assessment_results INSERT (the row exists, so `auth.uid()` matched `user_id`). Same client, same call stack, microseconds later, so the session is also live for the subsequent profile UPDATE. Session timing is not the cause here.
4. **Does the failing transactional/verification email abort the flow?** No. `Register.tsx:130-145` wraps `send-verification-email` in try/catch and only toasts on error. `syncGuestAssessmentToProfile` is called unconditionally on line 147 right after. We have proof it ran (assessment_results row + 48h deadline).

## 4. Why the profile UPDATE was skipped

The profile UPDATE in `assessmentSync.ts` is gated by **two nested ifs**:

```
if (guestXimatar) {                          // line 156
  const { data: ximatarData } = await ...    // line 158, .single()
  if (ximatarData) {                         // line 164
    profileUpdate = { ximatar, ximatar_id, ximatar_assigned_at,
                      creation_source, profile_complete, pillar_scores, … }
    await supabase.from('profiles').update(profileUpdate).eq('user_id', userId)
  }
}
```

`pillar_scores`, `ximatar`, `profile_complete`, and every other ximatar field are written **only inside this nested block**. So if `guestXimatar` is missing OR if the `ximatars` row lookup returns null, **nothing** about the archetype/pillars lands on `profiles`, even though `guestPillarScores` is sitting right there in sessionStorage and `total_score` was just computed from it.

We know for these users:

- `guestPillarScores` WAS present in sessionStorage (the `assessment_results` insert path is itself gated by `if (guestPillarScores)` at line 76, and `total_score` was computed from it).
- The `ximatars` table contains all 12 labels used by `XimatarAssessment.tsx` (`horse, owl, lion, dolphin, fox, wolf, parrot, elephant, cat, bee, chameleon, bear`) and the `ximatar_type` enum matches — so `ximatarData` lookup cannot return null for any valid label.
- Therefore `guestXimatar` must have been **null/empty** in sessionStorage at the moment sync ran, while `guest_pillar_scores` was still there.

Likely upstream causes (to confirm with the user, not investigate yet):

- The two keys are written together in `XimatarAssessment.tsx:255-256`, so a same-tab same-flow run shouldn't lose only one. Plausible scenarios:
  - User completed the assessment in one tab/browser and registered in another (sessionStorage is per-tab).
  - User reloaded or hit a route that selectively wrote `guest_pillar_scores` from a different code path without setting `guest_ximatar` (need to grep — only one writer found today, but worth double-checking after release notes).
  - Two parallel `syncGuestAssessmentToProfile` calls (e.g. `AuthCallback` `onAuthStateChange` + `getSession`) — the first call clears all `guest_*` keys at lines 245-254, the second call then sees `guestPillarScores=null AND guestXimatar=null`. But that would leave the profile in the **correct** state from the first call. Not what we see here (Register path, not OAuth, only one assessment_results row).
  - Most likely: the user took the assessment **after** registration via the logged-in path, which inserts `assessment_results` + `assessment_answers` — but `assessment_answers` is empty, ruling this out too. So the genuinely puzzling residue is: `guest_pillar_scores` set, `guest_ximatar` not. This deserves a quick repro before any code fix.

## 5. Secondary observations (not the root cause, but real)

- `pillar_scores` table has no INSERT RLS policy → the client INSERT at `assessmentSync.ts:111-113` always fails. Errors are logged, execution continues. The table is effectively never populated by sync.
- `assessmentSync` checks `error` but never `count`/affected rows on the critical profile UPDATE — a future RLS or `eq` regression will look like success.
- The logged-in assessment path in `XimatarAssessment.tsx` relies entirely on DB triggers to populate `profiles`, and `sync_assessment_to_profile` only copies `pillar_scores` and `ximatar_id` — never `ximatar` (enum), `ximatar_name`, `ximatar_assigned_at`, `drive_level`, `profile_complete`, `strongest_pillar`, `weakest_pillar`, `ximatar_storytelling`, `ximatar_growth_path`. So a user who registers first and assesses second can never get a "complete" profile through this path alone, regardless of the current bug.
- `send-verification-email` failures do **not** block the sync. Not involved here.

## 6. Suggested next step (not executed)

Before changing code, decide whether to:

(a) Move the `pillar_scores` / `profile_complete` / `drive_level` writes **out** of the `if (guestXimatar) { if (ximatarData) { … } }` nest so they land whenever the data exists, with the ximatar fields layered on top when available; and
(b) Add an affected-row check (`.select('user_id')` after the update or `returning=representation`) so a future RLS regression is loud, not silent; and
(c) Optionally have `sync_assessment_to_profile` also copy the ximatar label/name/assigned_at so the logged-in path produces a complete profile too.

Awaiting confirmation before touching code.
