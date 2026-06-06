# Six-part plan — pay transparency, mindset UX, audio, blind scope, controlled L1 nudge

Mirroring `xima-candidate-journey.html` and `xima-business-create.html`. All DB changes ship as Supabase migrations. `transcribe-audio` and `aria-speak` are pre-existing — only called via `supabase.functions.invoke`, never (re)deployed.

---

## PART 1 — RAL range + CCNL on the hiring goal

### Migration
Add to `public.hiring_goal_drafts` (the business-side hiring-goal table; `salary_min/max/period/currency` already live there):

```sql
ALTER TABLE public.hiring_goal_drafts
  ADD COLUMN ral_min integer,
  ADD COLUMN ral_max integer,
  ADD COLUMN ccnl text;

-- Validation trigger (not a CHECK — keeps it editable later):
-- ral_min ≤ ral_max when both set, both ≥ 0.
```

Also add `ral_min`, `ral_max`, `ccnl` to `public.job_posts` so the candidate-facing job render and the mindset intro (Part 3) can read them without joining drafts. Backfill: leave NULL.

No grants/policies change — existing ones cover the new columns.

### Business form (`src/pages/business/HiringGoalCreate.tsx` + the create-challenge surface in Part 2)
- New "Trasparenza retributiva" group with three inputs:
  - `RAL minima` (€/anno, integer)
  - `RAL massima` (€/anno, integer)
  - `CCNL` select — options seeded from a static constant `CCNL_OPTIONS` in `src/lib/business/ccnl.ts`: Commercio e Terziario, Dirigenti Industria, Metalmeccanico Industria, Metalmeccanico Artigianato, Edilizia Industria, Studi Professionali, Pubblici Esercizi/Turismo, Trasporti e Logistica, Chimico-Farmaceutico, Credito (ABI), Assicurazioni (ANIA), Telecomunicazioni, Sanità Privata, Altro (free text).
  - Helper microcopy: "Obbligatorio dal 7 giugno 2026 (D.Lgs. 96/2026 — Direttiva UE 2023/970 sulla trasparenza retributiva)."
- Wired into the existing draft-save mutation; on goal activation we copy the three fields onto the linked `job_posts` row.

### Guardrail (cross-cutting)
- Audit every candidate-facing form/profile field for "current/previous salary" prompts; remove or hide. Concretely: `src/pages/Profile.tsx`, candidate onboarding, `candidate_job_preferences` UI (the existing private `salary_expectation` stays — that's the candidate's own ASK, allowed; **never** ask for past/current compensation).
- Add a lint-style comment + a unit/runtime invariant in the relevant form components so future fields don't reintroduce it.

---

## PART 2 — Business "Create XIMA Core Challenge" page

File: `src/pages/business/CreateXimaCoreChallenge.tsx` (existing). Restructure to match `xima-business-create.html`.

- **Remove** the "5 fixed questions" preview block from the *candidate-facing framing* section.
- **Replace** with "L'esperienza del candidato" — a 4-step horizontal stepper:
  1. Istinto — carte rapide, scelta di pancia
  2. La giornata — micro-decisioni durante una giornata simulata
  3. Debrief con Aria — riflessione guidata
  4. Esito — sfaccettature accese, niente punteggi visibili
  Keep the existing wording: "standardizzato · confronto equo".
- **New "Cosa misura" panel**: two columns.
  - Sinistra — i 5 pilastri: Drive, Potenza computazionale, Comunicazione, Creatività, Conoscenza (with one-line definitions sourced from `mem://logic/pillar-definitions`).
  - Destra — i 5 tipi di signal (framing, decision quality, execution bias, impact thinking, collaboration/communication) from `src/lib/signals/qualitativeSignals.ts`.
- **New "Valutazione alla cieca" panel**: selling-point card explaining that the candidate never sees the company name in L1/L2 — only role + sector descriptor. Reinforces fairness.
- **New "Trasparenza retributiva" block**: shows RAL min–max + CCNL pulled from Part 1 (read-only mirror of what the business set on the hiring goal; with a "Modifica" link back to the goal settings).
- **"Anteprima candidato" button**: route to a preview that renders the actual `MindsetChallenge` flow (Intro → Instinct → Day → Debrief → Resolve) with a sandbox `invitationId` flag so submissions aren't persisted — not the deprecated 5-question Q&A preview.

No DB change here beyond Part 1.

---

## PART 3 — Candidate mindset intro screen with Aria's context

File: `src/components/candidate/mindset/MindsetIntro.tsx` (existing) — extend; add a new step before `'instinct'` in `MindsetChallenge.tsx` (the current `'intro'` step already exists — we enrich it, no flow change).

Intro content blocks (Italian copy, all required):
1. **Aria's greeting** — existing `guideName` + `intro`. Keep "non ci sono risposte giuste" framing.
2. **Contesto azienda (senza identità)**: sector/nature + one-line descriptor — e.g. "Un'azienda del settore logistica, mid-size, in fase di scale-up." **Never the company name.**
3. **L'obiettivo**: role title + 1–2 line "cosa cercano" summary.
4. **Trasparenza retributiva**: "RAL €X.000 – €Y.000 · CCNL <name>" pulled from the job post.
5. **Crescita (qualitativa)**: "Completare questa sfida rafforza il tuo XIMAtar e rende il tuo profilo più rilevante per le aziende." — **never a number, never a level-up promise**.
6. Primary CTA `Inizia` → existing `setStep('instinct')`.

### Data source
Add `intro_context` to the mindset config payload, generated by `generate-challenge` alongside the existing mindset content, shape:

```ts
intro_context: {
  company_descriptor: string;   // sector + one-line, NO company name (Part 5 enforces)
  role_title: string;
  role_summary: string;         // 1–2 lines, what they look for
  compensation: { ral_min: number|null; ral_max: number|null; ccnl: string|null; currency: 'EUR' };
  growth_line: string;          // qualitative only
}
```

Compose client-side as fallback when the generator hasn't filled it (read role/comp from the linked `job_posts` row via the existing invitation→challenge→job_post chain).

Strings stored in IT (locale will follow `candidate.locale` later if needed; no i18n key change in this round).

---

## PART 4 — Audio (call existing edge functions)

No edge function changes; only client wiring.

### A) Spoken answers
New reusable component `src/components/candidate/audio/VoiceDictateButton.tsx`:
- Toggles `MediaRecorder` (`audio/webm`).
- On stop → base64-encode the Blob → `supabase.functions.invoke('transcribe-audio', { body: { audio, mimeType: 'audio/webm', language: 'it' } })`.
- Receives `{ text }` → appends to the bound textarea (`existing + ' ' + text` when non-empty, else `text`); typing remains free.
- Privacy line under the button: "L'audio viene trascritto e poi eliminato — conserviamo solo le parole."
- Never persists the blob; URL.revokeObjectURL on any preview.
- Mount in: `GuideDebrief.tsx` textarea(s), and any L2 open-answer field (`src/pages/candidate/ChallengeCompletion.tsx` open-text inputs).

### B) Aria's voice ("Ascolta")
New `src/components/candidate/audio/AriaSpeakButton.tsx`:
- Props: `text`, `messageKey`.
- On click → `supabase.functions.invoke('aria-speak', { body: { text } })`; receives `{ audio_base64 }`; plays `new Audio('data:audio/mpeg;base64,' + audio_base64)`.
- Caches the base64 per `messageKey` in component state (Map). Re-plays from cache on subsequent clicks — no re-invoke.
- On error → toast suppressed, button hidden/disabled; never blocks the flow.
- Mount next to Aria's intro line (Part 3 intro) and each Aria debrief line in `GuideDebrief.tsx`.

No new secrets, no config.toml change.

---

## PART 5 — Blind scope in `generate-challenge`

File: `supabase/functions/generate-challenge/index.ts`.

System-prompt additions for the candidate-facing scenario AND all mindset payload fields (`guide.intro`, `instinct_cards[].prompt`, `day.items[].context`, `guide.debrief_focus` copy):

> "Lo scenario e tutte le interazioni con il candidato non devono MAI contenere il nome dell'azienda committente né nomi reali di clienti, concorrenti o partner. Usa descrittori generici: 'un grande operatore logistico', 'un concorrente del settore', 'un cliente importante del mercato EMEA', 'un fornitore strategico'. Il candidato non deve poter identificare l'azienda dal testo."

Post-generation server-side sanitizer:
- Pull `company.name` + `company.brand_aliases` (from `company_profiles`) and `job_post.title`/known third-party names if listed.
- Run a case-insensitive regex strip on every candidate-facing string field; replace hits with the matching generic descriptor and log a `correlation_id` warning when triggered.
- Business-side view (`shortlist_results`, business challenge detail) keeps the unredacted scenario from `business_payload` — only the `candidate_payload` is sanitized.

`intro_context.company_descriptor` (Part 3) generated under the same constraints.

---

## PART 6 — Controlled pillar nudge in L1 mindset

File: `supabase/functions/analyze-open-answer/index.ts`, `format === 'mindset'` branch only. Reverses one piece of the last change.

- **Re-add** `persistTrajectoryEvent({ source_type: 'l1_challenge', user_id, correlation_id, deltas: pillar_impact, … })` inside the mindset branch, so pillar scores move. Existing caps in `persistTrajectoryEvent` keep deltas bounded (±N per pillar per event); do not relax them.
- **Do NOT** re-add `level_up_status`, do NOT call any archetype-recompute / re-labeling. Archetype stays anchored — re-derivation only happens on the quarterly DNA cadence (separate codepath).
- Keep the `challenge_submissions.signals_payload` write exactly as today (framing/decision_quality/execution_bias/impact_thinking/overall/summary/flags/confidence + descriptive `pillar_impact`/`pillar_reasoning` inside the signals envelope).
- Candidate response payload: still **no numbers**. Add a single qualitative cue field `growth_cue: 'xima_strengthened'` that the client renders as "Il tuo XIMAtar si è rafforzato" on the Resolve screen. No numeric deltas, no pillar names exposed.
- Free-text scoring path unchanged (the wrap stays `if (!isMindset)` for everything except the trajectory call, which is now allowed for both branches with the bounded `pillar_impact` source).

---

## Execution order (when approved)

1. Migration: `ral_min/ral_max/ccnl` on `hiring_goal_drafts` + `job_posts` + validation trigger.
2. Part 1 UI on hiring goal + Part 2 restructure of `CreateXimaCoreChallenge.tsx` (depends on migration types).
3. `generate-challenge` blind-scope + `intro_context` (Parts 3 + 5) → deploy.
4. `MindsetIntro` enrichment + new mindset intro context wiring (Part 3).
5. Audio components + mount points (Part 4).
6. `analyze-open-answer` mindset branch: re-add trajectory call only, add `growth_cue` (Part 6) → deploy. Client Resolve screen renders the cue.
7. Smoke: business creates goal with RAL+CCNL → generates challenge → candidate sees intro with descriptor + RAL, completes mindset → trajectory event lands, archetype unchanged, audio round-trips, no company name in candidate strings.

Free-text scoring, mentor flows, business pipeline beyond the create page, and email infra (Part 4 of the previous plan) are untouched.

Awaiting approval to execute.
