# Four-part fix plan

Reporting before executing. All DB changes go through Supabase migrations.

---

## PART 1 — Unblock onboarding: archetype must always land on `profiles`

**Files**
- `src/utils/assessmentSync.ts` (rewrite the profile-write block, no behavior outside this function changes)
- `src/lib/ximatarTaxonomy.ts` (additive — export a shared archetype-from-pillars helper)
- `src/components/ximatar-journey/XimatarAssessment.tsx` (use the shared helper; verify guest_ximatar write)
- Supabase migration for `pillar_scores` table INSERT policy (Part 1.5)

### 1.1 Extract shared archetype-selection helper

Create one helper that both the guest assessment and the sync use, so the archetype the sync derives is byte-identical to the one the candidate saw.

The selection logic currently lives inline in `XimatarAssessment.tsx:218-244` and operates on 0–10 pillar scores. It is a top-2-pillar switch (parrot / owl / elephant / dolphin / cat / horse / fox / bee / chameleon — falls back to fox/chameleon). The plan uses **the exact same switch**, not `rankXimatarsByDistance` (which uses a different 0–100 vector and would produce different labels).

Add to `src/lib/ximatarTaxonomy.ts`:

```ts
export type AssessmentPillarScores = {
  computational_power: number; communication: number;
  knowledge: number; creativity: number; drive: number;
};

// Identical to the inline logic in XimatarAssessment.tsx, kept on the 0–10 scale.
export function selectArchetypeFromAssessmentPillars(scores: AssessmentPillarScores): {
  label: string;
  driveLevel: 'high' | 'medium' | 'low';
  strongest: keyof AssessmentPillarScores;
  weakest:   keyof AssessmentPillarScores;
} { /* the switch from lines 218-244 + drive thresholds 7.5/5 + strongest/weakest */ }
```

Then change `XimatarAssessment.tsx` lines 217–252 to call this helper (no logic change). Same call from `assessmentSync.ts` when `guest_ximatar` is absent.

### 1.2 Un-nest the profile UPDATE in `syncGuestAssessmentToProfile`

Rewrite lines 155–212 of `assessmentSync.ts`:

```text
if (guestPillarScores parses to a non-empty object) {
  parsedScores = JSON.parse(guestPillarScores)

  // Resolve archetype label
  resolvedLabel = guestXimatar?.toLowerCase()
  if (!resolvedLabel) {
    derived = selectArchetypeFromAssessmentPillars(parsedScores)
    resolvedLabel  = derived.label
    guestDrive     = guestDrive     || derived.driveLevel
    guestStrongest = guestStrongest || derived.strongest
    guestWeakest   = guestWeakest   || derived.weakest
    console.warn('[sync] guest_ximatar missing — derived from pillar_scores', { resolvedLabel })
  }

  // Resolve ximatar_id (best effort)
  ximatarRow = supabase.from('ximatars').select('id,image_url').eq('label', resolvedLabel).maybeSingle()

  // Always-write fields (never gated on ximatarRow):
  profileUpdate = {
    pillar_scores:      parsedScores,
    profile_complete:   true,
    creation_source:   'assessment',
    ximatar_assigned_at: now,
    drive_level:        guestDrive       ?? null,
    strongest_pillar:   guestStrongest   ?? null,
    weakest_pillar:     guestWeakest     ?? null,
    ximatar_storytelling: guestStorytelling ?? null,
    ximatar_growth_path:  guestGrowthPath   ?? null,
    ximatar:            resolvedLabel,                // enum value
    ximatar_name:       guestName ?? capitalize(resolvedLabel),
  }
  if (ximatarRow) {
    profileUpdate.ximatar_id    = ximatarRow.id
    profileUpdate.ximatar_image = guestImage ?? ximatarRow.image_url
  } else {
    console.error('[sync] CRITICAL: ximatars row not found for', resolvedLabel) // still writes the rest
  }

  // 1.3 affected-row check — see below
  { data: updatedRows, error } =
    supabase.from('profiles').update(profileUpdate).eq('user_id', userId).select('user_id')
  if (error || !updatedRows?.length) {
    console.error('[sync] PROFILE UPDATE AFFECTED 0 ROWS', { userId, error })
    return false
  }
  console.log('[sync] profile updated', { userId, ximatar: resolvedLabel })

  // assessment_results.ximatar_id link stays as today, gated on guestResultId AND ximatarRow.
}
```

Key invariants:
- The whole block is gated only on `guestPillarScores` parsing successfully.
- An archetype is **always** chosen — guest value first, derived second.
- `ximatar`, `ximatar_id`, `ximatar_name`, `ximatar_assigned_at`, `profile_complete`, `pillar_scores`, `drive_level` are written together.
- If `ximatars` lookup fails (should be impossible), the rest of the update still lands and we log loudly.

### 1.3 Affected-row check (Part 1.3 in the brief)

Use `.select('user_id')` after `.update(...)` and treat `data.length === 0` as an error (with `console.error`), not as success. Done above. Same pattern applied to `assessment_results` update at lines 60-66 and the new `assessment_results` link so silent-RLS-misses become loud.

### 1.4 Verify upstream guest_ximatar write

Read `XimatarAssessment.tsx:204-262` end-to-end and confirm `sessionStorage.setItem('guest_ximatar', …)` and `'guest_pillar_scores'` are written together with no early return between them. After 1.1, both keys are written from the same `selectArchetypeFromAssessmentPillars` result inside the same try block, so they cannot diverge again. If anything still looks racy (e.g. async between the two setItem calls), fold the writes into a single setItem-then-setItem pair with no `await` between them. Document the finding in the PR description; no code change beyond 1.1 unless a real defect is found.

### 1.5 `pillar_scores` table: add INSERT policy via migration

The table is read elsewhere (see `useSupabaseAssessmentData`), so we **add** an INSERT policy rather than remove the client write. Migration:

```sql
GRANT INSERT ON public.pillar_scores TO authenticated;

CREATE POLICY "pillar_scores: owner insert"
  ON public.pillar_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_results ar
      WHERE ar.id = pillar_scores.assessment_result_id
        AND ar.user_id = auth.uid()
    )
  );
```

(Existing SELECT policies stay; no schema change.)

---

## PART 2 — Logged-in path produces complete profiles (DB migration)

Replace `public.sync_assessment_to_profile` so it also writes the archetype/identity fields the gate needs. The trigger already runs `SECURITY DEFINER`, so we keep that.

New body (idempotent migration `CREATE OR REPLACE FUNCTION`):

```sql
CREATE OR REPLACE FUNCTION public.sync_assessment_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label public.ximatar_type;
  v_label_text text;
BEGIN
  IF NEW.ximatar_id IS NOT NULL THEN
    SELECT x.label::text INTO v_label_text FROM public.ximatars x WHERE x.id = NEW.ximatar_id;
    BEGIN
      v_label := v_label_text::public.ximatar_type;
    EXCEPTION WHEN OTHERS THEN
      v_label := NULL;
    END;
  END IF;

  BEGIN
    UPDATE public.profiles
    SET
      pillar_scores        = COALESCE(NEW.pillars,     pillar_scores),
      ximatar_id           = COALESCE(NEW.ximatar_id,  ximatar_id),
      ximatar              = COALESCE(v_label,         ximatar),
      ximatar_name         = COALESCE(initcap(v_label_text), ximatar_name),
      ximatar_assigned_at  = CASE WHEN NEW.ximatar_id IS NOT NULL AND ximatar_assigned_at IS NULL
                                  THEN now() ELSE ximatar_assigned_at END,
      profile_complete     = CASE WHEN NEW.pillars IS NOT NULL AND NEW.ximatar_id IS NOT NULL
                                  THEN true ELSE profile_complete END,
      updated_at           = now()
    WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_assessment_to_profile failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
```

Notes:
- Uses `COALESCE` so it never blanks an existing value.
- `profile_complete` only flips to `true` when both `pillars` and `ximatar_id` are non-null on the result.
- `drive_level`, `strongest_pillar`, `weakest_pillar`, `ximatar_storytelling`, `ximatar_growth_path` remain owned by the client sync path (they're not on `assessment_results`) — those are populated by Part 1 for guest flow. For the logged-in flow we accept these stay null; out of scope for the bug.
- Trigger binding (`trg_sync_assessment`) is unchanged.

---

## PART 3 — Mindset scorer: no archetype / pillar writes

Edit `supabase/functions/analyze-open-answer/index.ts`, mindset branch ONLY:

1. Wrap the trajectory block at lines 560-590 in `if (!isMindset) { … }`. The free-text path keeps it identical; mindset never calls `persistTrajectoryEvent` and never writes `profiles.pillar_scores` or triggers leveling.
2. Initialize `levelUpStatus` once at the top of the response build; for the mindset return at lines 623-633, drop the spread of `level_up_status` (the field is removed from the mindset response entirely).
3. Keep the server-side `signals_payload` write to `challenge_submissions` (the company-facing description) exactly as today, including all rubric fields (`framing`, `execution_bias`, `impact_thinking`, `decision_quality`, `overall`, `summary`, `flags`, `confidence`) and any descriptive `pillar_impact`/`pillar_reasoning` — but only inside the `signals` envelope, never persisted to profiles or trajectory.
4. Free-text path: no change. The wrap is `if (!isMindset)`, not a touch to the existing logic.
5. Client `useMindsetDraft.ts`: no changes — it already ignores `level_up_status` for mindset; dropping the field is non-breaking.

Deploy `analyze-open-answer` after edit.

---

## PART 4 — Provision the transactional-email backend

Today `send-transactional-email` references `suppressed_emails`, `email_unsubscribe_tokens`, `email_send_log`, and the `enqueue_email` RPC against pgmq queue `transactional_emails` — none of which exist — so every signup welcome attempt 500s. The legacy `email_outbox` + `process-email-outbox` is a separate, parallel mechanism.

Steps:

1. **Provision infra (managed)**: call `email_domain--setup_email_infra` to create pgmq, the `auth_emails` + `transactional_emails` queues, `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, `email_send_state`, the `enqueue_email` / `read_email_batch` / `delete_email` / `move_to_dlq` RPC wrappers, the Vault service-role secret, and the pg_cron job that runs `process-email-queue` every 5 s. (Do not write this SQL by hand — it's tool-owned.)
2. **Verify templates registry**: confirm the welcome template invoked from `src/pages/Profile.tsx:62` is registered in `_shared/transactional-email-templates/registry.ts` with the same `templateName`. If not, the user needs to tell us which template; otherwise the function 200s but the queue worker will fail to render.
3. **Reconcile the two queue mechanisms**: keep the new pgmq queue (`transactional_emails` + `process-email-queue`) as the canonical path. `email_outbox` + `process-email-outbox` is legacy. Plan:
   - Leave `email_outbox` rows + function in place (no destructive change).
   - Audit callers: any code path still inserting into `email_outbox` continues to work via `process-email-outbox`; any path going through `send-transactional-email` will now use pgmq.
   - Add a one-line README note in `supabase/functions/process-email-outbox/index.ts` marking it legacy. No deletes in this plan — listing the legacy paths so a follow-up can retire them once new path is verified.
4. **Deploy**: `supabase--deploy_edge_functions` for `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `process-email-queue`.
5. **Verify**: trigger a fresh signup welcome (or call `send-transactional-email` once with a known template + idempotency key) and check:
   - HTTP 200 from the function.
   - A row in `email_send_log` for the recipient (`status` in `pending` → `sent`).
   - Either an entry in pgmq `transactional_emails` (during the brief window before processing) or `email_send_log.status = 'sent'` after the next cron tick.
   - `suppressed_emails` is consulted (404/empty for a fresh user).

Out of scope for Part 4: any change to `send-verification-email` flow, auth template scaffolding (`auth-email-hook` is already deployed per the guide), or removal of `email_outbox`.

---

## Execution order (when approved)

1. Migration (Part 1.5 INSERT policy + Part 2 trigger update) — single migration file.
2. Shared helper + `XimatarAssessment.tsx` refactor (Part 1.1).
3. `assessmentSync.ts` rewrite (Part 1.2 + 1.3) + `XimatarAssessment.tsx` audit note (Part 1.4).
4. `analyze-open-answer/index.ts` mindset branch (Part 3) → deploy.
5. `email_domain--setup_email_infra` → deploy email functions → smoke-test signup (Part 4).

Free-text scoring path, mentor flows, business pipeline, and anything not listed here are untouched.

Awaiting approval to execute.
