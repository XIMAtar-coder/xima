# Mindset L1 Rubric Scoring + Server-Side Signals Write

## Goal

In the mindset branch only:
1. Make `analyze-open-answer` ask Claude for the **L1 rubric** (`framing / execution_bias / impact_thinking / decision_quality`) — the same shape `rubric.criteria` uses for L1 challenges — instead of the free-text rubric (`relevance / depth / structure / originality`).
2. Build a `signals` object from those keys and write it to `challenge_submissions.signals_payload` **server-side via service role**, keyed by `invitation_id`, because the row is already `submitted` and the client-side update is being blocked.
3. Frontend: include `invitation_id` in the invoke body and drop the client-side `signals_payload` write.

Free-text scoring path is untouched. Evidence-ledger gating, trajectory persistence, and the response shape stay as they are today.

## Files changed

1. `supabase/functions/analyze-open-answer/index.ts`
2. `src/hooks/useMindsetDraft.ts`

Nothing else.

## 1) `supabase/functions/analyze-open-answer/index.ts`

### Body parsing
- Add `invitation_id` to the destructured body (only used in the mindset branch).

### System prompt — mindset branch only
Today every request uses the same prompt that asks for `score_breakdown.{relevance, depth, structure, originality}`. When `isMindset === true`, swap the rubric and the JSON contract to:

```text
SCORING RUBRIC (each 0–100):
- framing — how the candidate frames the situation: stakes, who's affected, what's at risk
- execution_bias — propensity to act, decide, move; vs deliberation/avoidance
- impact_thinking — awareness of downstream consequences and second-order effects
- decision_quality — coherence between instincts, day reactions, and the debrief reasoning

OVERALL = balanced read across the four (0–100). NOT a sum.
```

JSON contract returned to Claude (mindset only):
```json
{
  "framing": 0-100,
  "execution_bias": 0-100,
  "impact_thinking": 0-100,
  "decision_quality": 0-100,
  "overall": 0-100,
  "summary": "<short, in the challenge language>",
  "flags": ["..."],
  "confidence": "low" | "medium" | "high",
  "pillar_impact": { "drive": -5..5, "computational_power": -5..5, "communication": -5..5, "creativity": -5..5, "knowledge": -5..5 },
  "pillar_reasoning": "..."
}
```

Implementation note: keep one `callAnthropicApi` call. Build `finalSystemPrompt` as either the existing free-text prompt (today) OR a mindset-specific prompt (above + the existing pillar block + context block). The mindset addendum currently glued to the free-text prompt is removed in favor of a clean dedicated prompt.

### Validation (mindset branch)
Replace the free-text validators (`score`, `reasons`, `improvement_tips`, `detected_red_flags`, `score_breakdown`) with mindset validators:
- All four rubric keys are numbers in `[0,100]` (clamp + round).
- `overall` is a number in `[0,100]` (clamp + round). If missing, fall back to the average of the four.
- `summary` is a string (default `''`).
- `flags` is `string[]` (default `[]`).
- `confidence` is `"low" | "medium" | "high"` (default `"medium"`).
- `pillar_impact` must contain all five keys; clamp each to `[-5,5]`.

Free-text path keeps its existing validators byte-for-byte.

### Post-LLM guardrails / red flags / quality label
For mindset: skip the free-text red-flag caps (`generic`, `off_topic`, `contradiction`, `copy_paste`, `admission_of_not_knowing`, `too_short`) — they don't apply to a structured payload. `flags` flows through as-is. `finalScore = overall` for downstream logs/audit/AI-context update. `qualityLabel` derived from `overall` using the existing thresholds (kept consistent so `challenge_history_summary` math still works).

### Build & persist signals (mindset only)
After the AI call validates, build the canonical signals object:
```ts
const signals = {
  framing,
  execution_bias,
  impact_thinking,
  decision_quality,
  overall,
  summary,
  flags,
  confidence,
  pillar_impact,
  pillar_reasoning,
  signals_version: 'v1',
  scoring_context: 'l1_challenge',
  format: 'mindset',
  ai_request_id: aiRequestId,
};
```

Then, only when `isMindset && invitation_id` is a non-empty string, write server-side with the service-role client (already used for the evidence-ledger block):

```ts
await serviceClient
  .from('challenge_submissions')
  .update({ signals_payload: signals })
  .eq('invitation_id', invitation_id);
```

Wrap in try/catch — log a single warn line on failure but do not change the response. Service role bypasses RLS, so the `status='submitted'` block on the candidate's client update does not apply here.

### Evidence ledger
Stays exactly as today: gated behind `!isMindset` (no `assessment_open_responses` row for mindset).

### Trajectory
Stays exactly as today: `persistTrajectoryEvent({ source_type: 'l1_challenge', deltas: pillarImpact, ... })` runs whenever `pillarImpact` is present and `user_id` exists. Mindset already provides `pillar_impact`, so the XIMAtar continues to move.

### Response shape
Mindset branch returns the same envelope the client expects, with `signals` echoed back so the call remains harmless to consumers:
```ts
return jsonResponse({
  score_total: overall,
  quality_label: qualityLabel,
  pillar_impact,
  scoring_context: 'l1_challenge',
  signals,           // echoed; client no longer writes it
  ...(levelUpStatus ? { level_up_status: levelUpStatus } : {}),
});
```

Free-text response is unchanged.

## 2) `src/hooks/useMindsetDraft.ts`

Inside the fire-and-forget block in `submit`:

- Add `invitation_id: invitationId` to the `body` of `supabase.functions.invoke('analyze-open-answer', { body: ... })`.
- **Remove** the `.then(async ({ data, error }) => { ... .update({ signals_payload: data })  })` chain entirely. Keep only the invoke as fire-and-forget (`.catch(() => {})`), since the edge function now performs the write.
- Everything else in `submit` (submission upsert, invitation status flip, navigation to resolve screen) is unchanged. Navigation already happens regardless of the invoke result.

No other callers of `analyze-open-answer` change (free-text path keeps sending `text/field/openKey/language` without `format` and hits the unchanged branch).

## Scope guarantees

- Free-text path: identical prompt, validators, breakdown, guardrails, evidence ledger, response.
- No DB migration. `signals_payload` column already exists on `challenge_submissions`.
- No new env var, no new shared file, no new edge function.
- Service-role write is bounded to the mindset branch and to a single row matched by `invitation_id`.
- Candidate UX: resolve screen still appears immediately on submit regardless of scoring outcome.
