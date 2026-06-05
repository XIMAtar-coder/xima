# Mindset Content Generation in L1 Pipeline — Additive Plan

## Goal

When an L1 (XIMA Core) challenge is generated, also generate role-contextual **mindset** content anchored to the SAME scenario / role / industry / company context, and merge it into `config_json` so the candidate's `ChallengeCompletion.tsx` route detects `experience: "mindset"` and renders the immersive flow.

Existing scenario, questions, evaluation_lens, rubric, expected_tensions, validators, pattern-library short-circuit, and the legacy handler are NOT touched. Mindset is best-effort: any failure leaves the L1 response byte-for-byte identical to today.

## Files changed (only these two)

1. `supabase/functions/generate-challenge/index.ts` — add an isolated second Claude call + a strict local validator, attach result to the existing response.
2. `src/pages/business/CreateXimaCoreChallenge.tsx` — capture the returned `mindset` block and spread it into the `config_json` literal at insert time.

Nothing else (no DB migration, no shared file, no new env var, no new dep, no other edge function, no client UI work).

## generate-challenge — additive logic

After `validateXimaCoreResult` succeeds, before each `jsonResponse(...)` return (both the Claude path AND the pattern-library short-circuit path), call a new local `generateMindsetBlock(...)` helper.

`generateMindsetBlock` reuses variables already in scope: `companyName`, `displayIndustry`, `teamCulture`, `operatingStyle`, `coreValues`, `roleTitle`, `taskDescription`, `requiredSkills`, `experienceLevel`, `workModel`, `contextTag`, `promptLang`, `langInstruction`, AND `validated.scenario` (so mindset lives in the exact same world as the scenario).

Call settings via existing `callAnthropicApi`:
- `functionName: 'generate-challenge'` (keeps Haiku routing, audit envelope, cost tracking)
- `inputSummary: 'l1_mindset_gen:<role>:<industry>'`
- `temperature: 0.85`, `maxTokens: 1800`
- `correlationId` reused

Parse with `extractJsonFromAiContent` + `JSON.parse`, then run `validateMindsetBlock`:
- `experience === "mindset"`
- `instinct_cards` length EXACTLY 3, each `{id, prompt, a:{label,facet}, b:{label,facet}}` non-empty; ids normalized to `c1|c2|c3`
- `day.clock`, `day.title` non-empty strings
- `day.gestures` length EXACTLY 4 with canonical ids `jump|delegate|wait|smooth`; emojis backfilled to `🏃 🤝 ⏳ 🕊️` if missing/wrong
- `day.items` length EXACTLY 4, ids normalized to `d1..d4`, each `{source, body}` non-empty (body ≥ ~40 chars)
- `guide.name` defaults to `"Aria"`; `guide.debrief_focus` must match an item id (else `"d1"`); `guide.intro`, `debrief_instruction`, `resolve_line` non-empty strings

On ANY failure (network, AnthropicError, parse, validation): swallow, log a single warning line, return `null`. L1 response still goes out unchanged.

On success: attach `mindset: <validatedBlock>` to BOTH existing response payloads:
- `jsonResponse({ ...validated, context_tag, used_fallback: false, mindset })`
- `jsonResponse({ ...validated, context_tag, used_fallback: false, _intelligence, mindset })`

Persistence stays in the client insert (matches today's pattern — function only writes `evaluation_lens / expected_tensions / context_snapshot` to existing rows).

### Mindset system prompt (Italian when promptLang=it)

Anchors hard to the role world, forbids generic-office output, pins the schema, pins canonical gesture ids/emojis, asks for short human facet labels (e.g. "Propensione all'azione", "Prudente, basso rischio"), warm non-judgmental guide tone. The L1 `validated.scenario` is injected verbatim so the mindset day lives in the same world (cantiere for Geometra, reparto for Lead Engineer, etc.). Returns JSON only, exact shape requested.

## CreateXimaCoreChallenge.tsx — additive merge

- Add `mindset?: Record<string, unknown> | null` to the existing `GeneratedChallengeContext` interface (or capture in a local `generatedMindset` state).
- After the `generate-challenge` invoke succeeds, save `response.mindset ?? null`.
- In the existing insert `config_json` literal, append spread at the end:

```ts
config_json: {
  xima_core: true,
  questions: localizedQuestions,
  candidate_intro: t('challenge.xima_core.candidate_intro'),
  generated_time_estimate: generatedTimeEstimate,
  context_tag: displayContextTag,
  ...(generatedMindset ? generatedMindset : {}),
}
```

That naturally yields top-level `experience: "mindset"` + `instinct_cards` + `day` + `guide`, which is exactly what `ChallengeCompletion.tsx` already branches on and what the `src/components/candidate/mindset/*` components consume.

No new UI, no preview surface, no copy changes. If `generatedMindset` is null, the insert is byte-for-byte identical to today.

## Scope guarantees

- L1 response shape is a strict superset (only `mindset` added) — no caller breaks.
- Pattern-library short-circuit still wins for FREE; mindset only runs after an L1 is in hand.
- No DB migration, no schema change, no RLS change.
- Legacy `handleLegacyGeneration` untouched.
- `compute-level2-signals`, `analyze-l3-frames`, `generate-l3-interview`, `generate-l2-challenge-from-job-post`, `analyze-open-answer`: untouched.
- Mindset is best-effort: a failure NEVER blocks L1 activation.

## Technical notes

- Reuse `callAnthropicApi` → identical audit envelope, cost tracking, retry.
- Same model routing as L1 (Haiku via `getModelForFunction`); no routing change.
- Locale comes from the same `locale`/`promptLang` already resolved at the top of the handler.
- Canonical gesture emojis (`🏃 🤝 ⏳ 🕊️`) are pinned in the prompt AND backfilled by the validator — wrong/missing emojis are normalized, not rejected.
- No new dependencies, no new shared files, no new env vars.
