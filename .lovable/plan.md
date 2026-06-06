# Stage C — Candidate L2 Conversation UI

Mirror the proven Mindset pattern (`MindsetChallenge` branch in `ChallengeCompletion.tsx`, `useMindsetDraft` hook, `MindsetIntro`/`ResolveScreen` shells). Old "System Design con Vincoli" Level 2 form stays live until `experience === "l2_conversation"` is set on the challenge's `config_json`.

## Pre-build report

**Flag-gating point — exactly one place:**
`src/pages/candidate/ChallengeCompletion.tsx` ~ line 786, immediately after the existing Mindset branch:

```ts
if (challenge.configJson?.experience === 'l2_conversation' && invitationId) {
  return <MainLayout><L2ConversationChallenge invitationId={invitationId} challengeId={challenge.challengeId} config={challenge.configJson} /></MainLayout>;
}
```

Everything below — `PreChallengeBriefing`, `level2Payload` form, `submissionStatus === 'submitted'` block, the `submitted_payload: submissionPayload` insert at line 658 — is bypassed for the new flow. The static L2 form path is otherwise untouched.

**Submit flips status — exactly one place (new code):**
Inside the new `useL2ConverseDraft.submit()` (modeled on `useMindsetDraft.submit`), an UPDATE on `challenge_submissions` setting:
- `status = 'submitted'`
- `submitted_at = now()`
- `submitted_payload = { format: 'l2_conversation', transcript, opening_line, curveball_fired, done, reason }` (mirror of `draft_payload` last written by `l2-converse`)
- `signals_version = 'v1'` (NOT NULL guard)

This single write fires the existing `emit_feed_signal` trigger downstream — no client signal computation.

## New files

```
src/components/candidate/l2converse/
  L2ConversationChallenge.tsx   # top-level state machine: intro | chat | resolve
  L2Intro.tsx                   # scene-set screen (counterpart name/role + scenario string, "conversation not test")
  L2ChatScreen.tsx              # thread + composer + send/end controls
  L2MessageBubble.tsx           # counterpart vs candidate styling, subtle degraded indicator
  L2TypingIndicator.tsx         # shimmer "Marco sta scrivendo…"
  L2ResolveScreen.tsx           # qualitative "il tuo XIMAtar si è rafforzato" mirror of ResolveScreen
  types.ts                      # TranscriptEntry, L2Payload, L2SimulationConfig (mirrors server contract)

src/hooks/
  useL2ConverseDraft.ts         # load existing draft/submitted row, expose transcript+turn_index, submit()
  useL2Converse.ts              # sendMessage(latest, turnIndex) → invokes l2-converse, handles 409 resync, degraded flag
```

i18n keys added to `src/i18n/locales/{it,en,es}.json` under `candidate.l2_conversation.*` (Italian primary, EN/ES mirrored).

## Behavior

**Intro screen** (mirrors `MindsetIntro`):
- Reads `config.l2_simulation.counterpart.{name, role}` and renders `config.l2_simulation.scenario` (a full string — there is no `scenario.framing` subfield) as the scene-set body text, blind-scoped as authored.
- Reuses `Level2ContextBlock` if available for the RAL/role context band already present in the candidate context.
- Frame copy (IT primary, EN/ES via keys): "Stai per avere una conversazione con {{name}}, {{role}}. Non è un test con punteggio — è un confronto. Il tuo XIMAtar si affina ascoltandoti."
- CTA: "Inizia la conversazione". No score language anywhere.

**Conversation screen**:
- On mount: seed thread from existing `draft_payload.transcript` if present, else show only `counterpart.opening_line` from spec as turn=-1 bubble. `turn_index` state = count of candidate replies already in transcript (0 on fresh start).
- Composer: textarea + send button + a subtle secondary "concludi" affordance (small text link "Voglio concludere" that inserts the word "concludi" into the next message, not a separate API call).
- On send → POST `l2-converse` with `{challenge_id, invitation_id, latest_candidate_message, turn_index}`. Optimistically append candidate bubble; show `L2TypingIndicator` while awaiting.
- On 200: replace server-returned `transcript` wholesale (server is source of truth), increment `turn_index`. If `degraded === true`, render the line normally with a subtle low-key visual cue (no error toast). If `done === true`, lock the composer and surface "Termina e invia".
- On 409 `TURN_INDEX_MISMATCH`: silently re-fetch `challenge_submissions.draft_payload`, rehydrate transcript, set `turn_index` from server `last_turn_index + 1`, drop optimistic bubble, allow retry.
- Hard stop at `turn_index === 7` (server enforces; UI mirrors). Composer disabled when `done === true`.

**Termina e invia**:
- Explicit button shown when `done === true` OR after the candidate has sent ≥1 turn (server handles `concludi` server-side; client just persists current transcript).
- Calls `useL2ConverseDraft.submit()` → flips `status='submitted'`, copies last `draft_payload` into `submitted_payload` with `format='l2_conversation'`. Navigates to resolve.

**Resolve screen** (mirrors `ResolveScreen`):
- "Il tuo XIMAtar si è rafforzato." + facet shimmer + "Condiviso con l'azienda." Back to `/profile`. Zero numbers, no scores, no transcript replay.

**Resume**:
- `useL2ConverseDraft` loads the single `challenge_submissions` row for the invitation. If `status='submitted'` with `submitted_payload.format='l2_conversation'`, jump to resolve. If `status='draft'` with `draft_payload.format='l2_conversation'`, hydrate chat at the correct `turn_index` (= candidate-role entries count). Otherwise start at intro.

## Design

Mobile-first, matches Liquid Glass tokens (light #f2f2f7, dark #08080d, glass surfaces from index.css). Counterpart bubble: muted surface, initials chip — no avatar photo. Candidate bubble: `primary` / `primary-foreground`. Typing indicator uses existing shimmer pattern. All copy via i18n keys; IT strings are primary, EN/ES literal mirrors.

## Out of scope (Stages D/E)

No changes to `l2-converse`, `compute-level2-signals`, scorer, business-side surfaces, triggers, or RLS. The static L2 form code path is not touched.

## File list (final)

Added:
- `src/components/candidate/l2converse/L2ConversationChallenge.tsx`
- `src/components/candidate/l2converse/L2Intro.tsx`
- `src/components/candidate/l2converse/L2ChatScreen.tsx`
- `src/components/candidate/l2converse/L2MessageBubble.tsx`
- `src/components/candidate/l2converse/L2TypingIndicator.tsx`
- `src/components/candidate/l2converse/L2ResolveScreen.tsx`
- `src/components/candidate/l2converse/types.ts`
- `src/hooks/useL2ConverseDraft.ts`
- `src/hooks/useL2Converse.ts`

Edited:
- `src/pages/candidate/ChallengeCompletion.tsx` (one branch, ~6 lines, right after Mindset branch at line 786)
- `src/i18n/locales/it.json`, `en.json`, `es.json` (add `candidate.l2_conversation.*` keys)
