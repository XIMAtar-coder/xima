# L2 "Crea e Invia Invito" — Surface Real Errors

## Root cause (verified)

`createChallengeAndInvite` (`src/components/business/Level2InviteModal.tsx:176-213`) wraps both Supabase calls in a single try/catch and toasts `t('level2.create_failed')` — an undefined key in the wrong namespace. Result:
- Postgres error from either INSERT is logged to console only, never shown.
- Toast renders the raw key (or empty) → looks "silent."
- `sendInvitation` is invoked unconditionally after the challenge insert resolves; if it throws, the same generic toast hides the real reason (RLS denial, FK, pipeline_locked, etc.).

## DB defaults (verified, no changes needed)

`SELECT column_default FROM information_schema.columns WHERE table_name='business_challenges'`:
- `level integer NOT NULL DEFAULT 2` ✓ — L2 inserts that omit `level` already resolve to 2.
- `status text NOT NULL DEFAULT 'draft'` — modal explicitly sets `'active'` ✓.
- `rubric jsonb` defaults to a stub; modal passes the full L2 rubric ✓.

Even though `level` defaults to 2, we will set it **explicitly** in the payload as a belt-and-braces guard against future default drift.

## Fix (Level2InviteModal.tsx only)

### A. `createChallengeAndInvite` — destructure + surface + abort

```ts
const createChallengeAndInvite = async (challengeData) => {
  setCreatingChallenge(true);
  try {
    const { data: newChallenge, error: createError } = await supabase
      .from('business_challenges')
      .insert([{
        business_id: businessId,
        hiring_goal_id: hiringGoalId,
        title: challengeData.title,
        description: challengeData.description,
        rubric: challengeData.rubric,
        time_estimate_minutes: challengeData.time_estimate_minutes,
        status: 'active',
        level: 2,                       // explicit, despite DB default = 2
      }])
      .select('id, level')
      .single();

    if (createError || !newChallenge) {
      console.error('[L2] business_challenges insert failed', createError, {
        businessId, hiringGoalId, payload: challengeData,
      });
      toast({
        title: t('common.error'),
        description: t('business.level2.create_failed', {
          message: createError?.message ?? 'unknown',
        }),
        variant: 'destructive',
      });
      return;                          // ABORT — do not invite
    }

    if (newChallenge.level !== 2) {
      console.error('[L2] created row has wrong level', newChallenge);
      toast({
        title: t('common.error'),
        description: t('business.level2.create_failed', {
          message: `level=${newChallenge.level}`,
        }),
        variant: 'destructive',
      });
      return;
    }

    await sendInvitation(newChallenge.id);   // success path only
  } finally {
    setCreatingChallenge(false);
  }
};
```

Key changes vs. current:
- Drops the outer catch-all that masked the real message.
- `createError.message` is now in the toast description.
- The success path runs **only** when `newChallenge` is non-null AND `level === 2`.

### B. `sendInvitation` — destructure the challenge_invitations insert

Current code (around line ~330) already `throw`s on most branches, but the final `challenge_invitations` INSERT must explicitly destructure `{ error }` and:
- `console.error` the full error object with `{ businessId, hiringGoalId, challengeId, candidateProfileId }`.
- Toast `t('business.level2.invite_failed', { message: error.message })` for generic failures (the existing specific mappings for `pipeline_locked` and duplicate-invitation stay).
- Return without showing the success toast.

No success toast unless the invitation row was actually returned.

## i18n (it / en / es) — `src/i18n/locales/{it,en,es}.json`

Add under `business.level2`:

- `create_failed`: "Errore nella creazione della sfida di Livello 2: {{message}}" (it) / EN / ES equivalents.
- `invite_failed`: "Errore nell'invio dell'invito di Livello 2: {{message}}" / EN / ES.

The legacy `level2.create_failed` key is no longer referenced after the modal switch; leave it in place for now (other call sites may still use it) but the modal stops reading it.

## Payloads (for the user's records)

**business_challenges INSERT** (the only place L2 rows are created from this modal):
```json
{
  "business_id": "<auth.uid()>",
  "hiring_goal_id": "<goal>",
  "title": "<template or custom>",
  "description": "<...>",
  "rubric": { "level": 2, "type": "role_based", ... },
  "time_estimate_minutes": 45,
  "status": "active",
  "level": 2
}
```
Returns: `id, level` (asserted == 2).

**challenge_invitations INSERT** (unchanged shape, now error-checked):
```json
{
  "business_id": "<auth.uid()>",
  "hiring_goal_id": "<goal>",
  "candidate_profile_id": "<cand>",
  "challenge_id": "<newChallenge.id>",
  "status": "invited",
  "sent_via": ["in_app"],
  "invite_token": "<uuid>"
}
```

## Validation

1. As Fiocchi on goal `eab2f3b2-…` / candidate `5218a7a2-…`, click "Crea e Invia Invito" on an L2 template. Expect either:
   - Success: a new `business_challenges` row with `level=2` AND a `challenge_invitations` row landing.
   - Failure: a toast whose description contains the actual Postgres `message` (RLS / FK / pipeline_locked text), and **no** `challenge_invitations` row.
2. Force-fail test (dev): temporarily pass an invalid `business_id` → toast must show the RLS error message, not the generic key.
3. Regression: success path still shows `business.level2.invite_sent`.

## Scope

- `src/components/business/Level2InviteModal.tsx`
- `src/i18n/locales/it.json`, `en.json`, `es.json`

No trigger / RLS / schema / migration changes.
