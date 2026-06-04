# Mindset L1 Challenge Experience

## 1. Branch the candidate page (no behavior change for free-text)

**File:** `src/pages/candidate/ChallengeCompletion.tsx`

- Extend the invitation→challenge select to also pull `config_json` from `business_challenges`.
- Store it on `ChallengeDetails` as `configJson: Record<string, any> | null`.
- Compute `const isMindset = challenge?.configJson?.experience === 'mindset'` once challenge is loaded.
- Branch **early** in render (after `loading` / `!challenge` / `prerequisiteBlock?.blocked` guards, BEFORE the PreChallengeBriefing block and BEFORE the submitted/active free-text returns):
  ```tsx
  if (isMindset) {
    return (
      <MainLayout>
        <MindsetChallenge
          invitationId={invitationId!}
          challenge={challenge}
          existingSubmission={{ id: submissionId, status: submissionStatus, submittedAt, payload: loadedMindsetPayload }}
        />
      </MainLayout>
    );
  }
  ```
- For mindset, **bypass** `timeInfo` / `isExpired` / `isUpcoming` / `isReadOnly`: no countdown, no "closed" state, no gating on `end_at`. This is local to the branch — the existing free-text path keeps `timeInfo` exactly as today.
- The existing `payload` / `level2Payload` / `saveDraft` / `handleSubmit` code and all free-text JSX remain untouched.

When loading an existing submission, if `submission.submitted_payload?.format === 'mindset'` or `submission.draft_payload?.format === 'mindset'`, hand the parsed payload to `<MindsetChallenge>` via `existingSubmission.payload`; do not try to coerce it into the L1/L2 free-text shapes.

## 2. New <MindsetChallenge> orchestrator

**File:** `src/components/candidate/mindset/MindsetChallenge.tsx`

State machine (single component, internal `step` state):
`'intro' → 'instinct' → 'day' → 'debrief' → 'resolve'`.

Reads everything from `challenge.configJson`:
```ts
type MindsetConfig = {
  experience: 'mindset';
  guide: { name?: string; intro: string; debrief_focus: string };
  instinct_cards: Array<{ id: string; prompt: string; a: { label: string; facet: string }; b: { label: string; facet: string } }>;
  day: { clock: string; items: Array<{ id: string; source: string; body: string }>; gestures: Array<{ id: string; emoji: string; label: string }> };
};
```

Local payload state:
```ts
type MindsetPayload = {
  format: 'mindset';
  instinct_choices: Array<{ card_id: string; choice: 'a' | 'b'; facet: string }>;
  day_log: Array<{ item_id: string; gesture: string }>;
  debrief: Array<{ q: string; a: string }>;
  lit_facets: string[];
};
```

Visual shell: existing `Card`, `Button`, `Badge`, `Progress`, `toast`, lucide icons; dark-theme tokens from `index.css`. No new color literals.

### Step 2.a — Intro (`MindsetIntro.tsx`)
Card with guide name (default "Aria"), `config.guide.intro`, a "nessuna risposta giusta" reassurance line (hardcoded IT string, since mindset is IT-only today), and a primary "Inizia" button → `setStep('instinct')`.

### Step 2.b — Instinct cards (`InstinctCards.tsx`)
- One card at a time, index in local state.
- Two large tappable option buttons (variant=outline, hover lift), label from `card.a.label` / `card.b.label`.
- Non-blocking urgency: thin `Progress`-style bar that fills over ~6s using CSS animation; **does not** auto-advance, just visual urgency.
- On tap: push `{card_id, choice, facet}` to `instinct_choices`, add facet to `lit_facets` (dedup), show a brief inline pill "Facet acceso: <facet>" for 900ms via local state, then `setIndex(i+1)`.
- When last card answered → `setStep('day')`.

### Step 2.c — Living day (`LivingDay.tsx`)
- Header: small clock badge with `config.day.clock`, title "Lunedì".
- One day item card at a time (`source` as small label, `body` as content).
- Below the item: row of gesture buttons rendered from `config.day.gestures` (`emoji` + `label`).
- On tap: push `{item_id, gesture}` to `day_log`, advance. No correctness feedback.
- After last item → `setStep('debrief')`.

### Step 2.d — Guide debrief (`GuideDebrief.tsx`)
- Find item where `item.id === config.guide.debrief_focus`; find the gesture the candidate chose for it from `day_log`.
- Aria asks a warm "perché" referencing the chosen gesture (template: `"Su «${item.source}» hai scelto ${gesture.emoji} ${gesture.label}. Cosa ti ha guidato?"`).
- Small `Textarea` (2–3 rows), submit button enabled when length ≥ 20 chars.
- On submit: push `{ q, a }` to `debrief`, show one-line warm ack from Aria ("Grazie, lo annoto."), advance to resolve.

### Step 2.e — Resolve (`ResolveScreen.tsx`)
- Lit facets rendered as `Badge` pills.
- Warm one-liner from Aria (config-overridable: `config.guide.resolve_line`, fallback hardcoded IT).
- "XIMAtar in fase di affinamento" cue with a static `Progress` showing L1 ✓ (no numeric score, no percentages).
- CTA: "Torna al profilo" → navigate `/profile`.

## 3. Persistence (`useMindsetDraft.ts`)

Mirrors the existing free-text upsert path 1:1 — same authoritative re-fetch of the invitation, same `onConflict: 'invitation_id'`, same status strings.

- `loadDraft(invitationId)` → returns existing `MindsetPayload | null` from `draft_payload` (or `submitted_payload` if status `'submitted'`), plus `{id, status, submittedAt}`.
- `saveDraftDebounced(payload)` — 1.5s debounce, upsert `{ draft_payload: payload, status: 'draft' }` with the same five FK columns the free-text path writes (`invitation_id, candidate_profile_id, business_id, hiring_goal_id, challenge_id`).
- `submit(payload)` — reuses **exactly** the free-text submit's status transitions:
  1. Re-fetch invitation for authoritative FKs.
  2. Upsert/update `challenge_submissions` with `status:'submitted'`, `submitted_payload: payload`, `draft_payload: payload`, `submitted_at: now`, `signals_version:'v1'` (kept to satisfy NOT NULL).
  3. `challenge_invitations.update({ status: 'submitted', responded_at: now })`.
- Calls `saveDraftDebounced` from `<MindsetChallenge>` after every state mutation (instinct choice, gesture choice, debrief saved).

## 4. Scoring call (non-blocking)

In `submit`, immediately after the DB submission succeeds and BEFORE navigating to resolve:

```ts
supabase.functions
  .invoke('analyze-open-answer', {
    body: {
      challenge_id: challenge.challengeId,
      user_id: authUserId,
      language: 'it',
      scoring_context: 'l1_challenge',
      format: 'mindset',
      mindset_payload: { instinct_choices, day_log, debrief },
    },
  })
  .then(async ({ data, error }) => {
    if (error || !data) return; // never block
    await supabase
      .from('challenge_submissions')
      .update({ signals_payload: data })
      .eq('invitation_id', invitationId);
  })
  .catch(() => {/* swallow */});
```

Resolve screen renders regardless of the call's outcome.

## 5. analyze-open-answer: accept mindset format

**File:** `supabase/functions/analyze-open-answer/index.ts`

Minimal additive change at the top of the handler:

- If `body.format === 'mindset'`, skip the existing `text` / `field` / `openKey` requirements and the non-answer detection.
- Build a synthetic "answer" string from `mindset_payload` (facets chosen + day_log gestures + debrief Q/A) and feed it through the same Claude scoring path but with a mindset-specific system prompt addendum:
  - Ask Claude to map `instinct_choices` facets and the debrief reasoning to the five pillars (drive / computational_power / communication / creativity / knowledge) producing `pillar_impact` and a `lit_facets` echo.
  - Score is computed internally but **not** returned to the client in a candidate-visible way — we only persist `signals_payload`. Existing `score_total` etc. still go into `signals_payload`; the candidate-facing resolve screen never reads them.
- Keep existing audit / evidence-ledger / trajectory code paths; gate the evidence-ledger insert behind `format !== 'mindset'` for now (no `assessment_open_responses` row exists for mindset).

No change to other callers — all existing requests still set `text` / `field` / `openKey` and fall into the unchanged branch.

## 6. Scope guarantees

- `challenge.configJson?.experience !== 'mindset'` → identical code path as today (no diff in rendered output, autosave cadence, validation, submit payload shape, signals computation, invitation status update).
- Business-side review, L2 flow, L3 flow, and any other challenge: untouched.
- No new DB migration. `config_json` already exists on `business_challenges`. No new RLS, no new edge function.

## Technical notes

- Type the new payload as `Json`-compatible (plain objects, no `Date`, no `undefined`); cast `as any` only at the Supabase boundary, matching current free-text code.
- All copy strings inside mindset components are IT literals for now; later i18n migration is trivial since they're isolated to the mindset folder.
- No new dependencies; reuse existing `Card`, `Button`, `Badge`, `Progress`, `Textarea`, lucide icons, sonner/use-toast.
- ASCII flow:
  ```text
  ChallengeCompletion (load + branch)
    └── isMindset? ─┬─ yes → <MindsetChallenge>
                    │           intro → instinct → day → debrief → resolve
                    │           (autosave draft_payload on each step)
                    │           submit → submitted_payload + invitation status
                    │                 → analyze-open-answer (fire-and-forget) → signals_payload
                    └─ no  → existing free-text UI (unchanged)
  ```
