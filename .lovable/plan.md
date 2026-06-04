## Goal

Additively generate role-contextual mindset content during L1 challenge generation, so every newly created XIMA Core Challenge carries an `experience: "mindset"` block in its `config_json` — flavored to the same role + industry + scenario the L1 was built around (Geometra → real cantiere Monday, Lead Engineer → real BMS day, etc.).

No change to scenario, questions, evaluation_lens, rubric, expected_tensions, validation, pattern-library short-circuit, or the legacy handler.

## Files to change

1. `supabase/functions/generate-challenge/index.ts` — add a second, isolated Claude call after the existing L1 scenario call succeeds; return its result on the response.
2. `src/pages/business/CreateXimaCoreChallenge.tsx` — when inserting the challenge, if the generate-challenge response carried a `mindset` block, spread it into `config_json` alongside the existing `xima_core` keys.

Nothing else is touched.

## generate-challenge — additive logic

After `validateXimaCoreResult` succeeds and BEFORE the final `jsonResponse(...)` return (the success path around lines 408–454, and also the pattern-library short-circuit path around 329–344):

- Build a `mindsetSystemPrompt` reusing the SAME variables already in scope: `companyName`, `displayIndustry`, `teamCulture`, `operatingStyle`, `coreValues`, `roleTitle`, `taskDescription`, `requiredSkills`, `experienceLevel`, `workModel`, `contextTag`, `promptLang`, `langInstruction`, AND the freshly generated `validated.scenario`. The mindset content must live in the same world as the scenario.
- Call `callAnthropicApi` a second time with:
  - `functionName: 'generate-challenge'` (keeps existing model routing — Haiku)
  - `inputSummary: 'l1_mindset_gen:...'`
  - `temperature: 0.85`, `maxTokens: 1800`
  - `correlationId` reused
- Parse with `extractJsonFromAiContent` + `JSON.parse`.
- Run a strict `validateMindset(parsed)` helper (new, local to this file):
  - `experience === "mindset"`
  - `instinct_cards` is an array of EXACTLY 3, each `{ id, prompt, a:{label,facet}, b:{label,facet} }` with non-empty strings; coerce/normalize ids to `c1|c2|c3`.
  - `day.clock`, `day.title` strings; `day.gestures` exactly 4 with ids `jump|delegate|wait|smooth`, each `{id, emoji, label}`; `day.items` exactly 4, each `{id, source, body}` with body ≥ 40 chars; ids normalized to `d1..d4`.
  - `guide.name` (default `"Aria"` if missing), `guide.intro` (string), `guide.debrief_focus` must be one of the item ids (default `"d1"`), `guide.debrief_instruction`, `guide.resolve_line`.
- On any failure of the mindset call (network, AnthropicError, validation fail, parse fail): swallow, log a single warning line, and continue. The L1 response MUST still go out — mindset is best-effort. No new error responses.
- On success: attach `mindset: <validatedBlock>` to the existing response payload returned at the two success points:
  - `jsonResponse({ ...validated, context_tag: ..., used_fallback: false, mindset })` (Claude path)
  - `jsonResponse({ ...validated, context_tag: ..., used_fallback: false, _intelligence: ..., mindset })` (pattern-library path)
- Do NOT write the mindset block to `business_challenges` from the edge function; persistence stays in the client insert (single source of truth, matches today's pattern where the function writes only `evaluation_lens / expected_tensions / context_snapshot` to an existing row).

### Mindset prompt shape (Italian when locale=it; otherwise `promptLang`)

System prompt sketch (will be tuned in code, conceptually):

```text
Sei "Aria", una guida calda e non giudicante. Devi creare il contenuto MINDSET per un
candidato che affronterà il ruolo qui sotto, NELLO STESSO MONDO dello scenario L1.

Lo scenario L1 (per ancorare tono, attori, strumenti, vincoli):
<<< {validated.scenario} >>>

CONTESTO RUOLO: {roleTitle} — {displayIndustry}
Azienda: {companyName} · Cultura: {teamCulture} · Stile: {operatingStyle}
Mansione: {taskDescription}
Competenze: {requiredSkills} · Livello: {experienceLevel} · Modalità: {workModel}

REGOLE:
- TUTTO il contenuto deve essere SPECIFICO per questo ruolo e settore. MAI generico da ufficio.
  Esempio: per un Geometra in cantiere il lunedì è un VERO cantiere (ponteggi, DL, ASL, fornitori,
  betoniere), non una riunione team in open space.
- 3 instinct_cards: dilemmi di pancia, due opzioni brevi e tangibili nel mondo del ruolo.
  Le "facet" sono etichette UMANE e CORTE (2–4 parole), es. "Propensione all'azione",
  "Prudente, basso rischio", "Decide d'istinto", "Cerca consenso", "Focus sul risultato",
  "Focus sulle persone". Mai sigle psicometriche.
- day.clock: orario di inizio plausibile per il ruolo ("7:30" cantiere, "8:45" ufficio…).
  day.title: il giorno (es. "Lunedì in cantiere", "Lunedì in reparto").
- 4 day.items: dilemmi reali del lunedì del ruolo, con attori e oggetti concreti
  (fornitore X, ispettore Y, email del DL, sample QA scartato, sprint planning…).
  source = chi/cosa porta l'evento ("DL", "WhatsApp capo squadra", "Email cliente", "Slack #qa").
  body = 1–3 frasi, niente domande.
- 4 gesture FISSI: ids `jump|delegate|wait|smooth`, emoji `🏃 🤝 ⏳ 🕊️`,
  label localizzata e calda ("Ci salto dentro", "Delego e seguo", "Aspetto e osservo", "Smusso e medio").
- guide.intro: 1–2 frasi calde, niente giudizio. guide.debrief_focus = "d1".
  guide.debrief_instruction in italiano, calda, mai punitiva.
  guide.resolve_line: 1 frase che riconosce lo stile senza dare un voto.
- Lingua: {promptLang}. {langInstruction}. JSON keys in inglese.

Restituisci SOLO JSON valido con ESATTAMENTE questa forma:
{
  "experience": "mindset",
  "instinct_cards": [ {"id":"c1","prompt":"…","a":{"label":"…","facet":"…"},"b":{"label":"…","facet":"…"}},
                      {"id":"c2",…}, {"id":"c3",…} ],
  "day": {
    "clock":"…","title":"…",
    "gestures":[{"id":"jump","emoji":"🏃","label":"…"},
                {"id":"delegate","emoji":"🤝","label":"…"},
                {"id":"wait","emoji":"⏳","label":"…"},
                {"id":"smooth","emoji":"🕊️","label":"…"}],
    "items":[{"id":"d1","source":"…","body":"…"}, …4 items]
  },
  "guide":{"name":"Aria","intro":"…","debrief_focus":"d1",
           "debrief_instruction":"…","resolve_line":"…"}
}
```

User message: short — "Genera il blocco MINDSET per {roleTitle} ({displayIndustry}), ancorato allo scenario sopra. Rispondi SOLO con il JSON."

### Validator pseudo-shape

```ts
function validateMindset(p: any): MindsetBlock | null {
  if (!p || p.experience !== 'mindset') return null;
  if (!Array.isArray(p.instinct_cards) || p.instinct_cards.length !== 3) return null;
  // normalize ids c1..c3, check a/b shape + non-empty label/facet
  // day: clock, title strings; gestures length 4 with required ids + emojis; items length 4 with d1..d4
  // guide: default name "Aria"; debrief_focus must match an item id else 'd1'
  return normalized;
}
```

## CreateXimaCoreChallenge.tsx — additive merge

Where `generate-challenge` is invoked (the existing call that already populates `scenario`, `localizedQuestions`, `evaluationLens`, etc.):
- Capture `response.mindset` into a local `generatedMindset` state.
- In the insert at lines 460–466, change the `config_json` literal to:
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
- That naturally yields `experience: "mindset"` plus `instinct_cards`, `day`, `guide` at the top level of `config_json`, which is exactly what `ChallengeCompletion.tsx` already branches on (`configJson.experience === 'mindset'`) and what the mindset components consume.
- No UI changes, no new buttons, no preview surface. If `generatedMindset` is null (mindset call failed), the challenge still saves exactly as today.

## Scope guarantees

- Existing L1 response shape is a strict superset (only `mindset` added) — no caller breaks.
- Pattern-library short-circuit still wins for FREE; mindset call only runs after a real or cached L1 is in hand.
- No DB migration. `config_json` already exists; no schema change.
- Legacy `handleLegacyGeneration` untouched.
- compute-level2-signals, analyze-l3-frames, generate-l3-interview, generate-l2-challenge-from-job-post: untouched.
- Mindset is best-effort: a failure in the mindset call never blocks L1 activation.

## Technical notes

- Reuse `callAnthropicApi` so audit envelope, cost tracking, and retry logic apply identically.
- Same model as L1 (Haiku via `getModelForFunction`); no new routing entry needed.
- Locale handling: same `locale` resolution already computed at the top of the handler.
- Emoji literals (`🏃 🤝 ⏳ 🕊️`) are pinned in the prompt AND re-asserted by the validator — if the model returns wrong/missing emojis we backfill the canonical ones during normalization rather than rejecting.
- No new dependencies, no new shared files, no new env vars.
