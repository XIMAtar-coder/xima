# Stage A — L2 "Worst Tuesday" Spec Generation

## Scope (Stage A only)

Generate and persist a per-goal L2 simulation spec on the `business_challenges` row. No candidate UI. No scorer. No trigger/RLS changes. Static "System Design con Vincoli" template stays live and is still what candidates run — the new spec is dormant data, gated by `config_json.experience = "l2_conversation"`, which the current L2 UI ignores.

## Where the generation goes

Extend `supabase/functions/generate-challenge/index.ts` (the same fn that generates L1 XIMA Core and the `mindset` block).

Trigger: when called with a `hiring_goal_id` AND the caller asks for level 2 (new `level: 2` field on the request, default `1` preserves today's behavior). When `level === 2`:

1. Fetch the goal exactly like the L1 path (`hiring_goal_drafts`: `role_title, function_area, experience_level, required_skills, nice_to_have_skills, ral_min/ral_max/ccnl, country, work_model, task_description`) plus the same company context block already assembled for L1 (industry label, team_culture, operating_style, core_values, growth_stage).
2. Reuse `buildBlindSanitizer(forbiddenTerms)` (line 294) on every candidate-facing string in the generated spec, with the same forbidden-terms list as L1 (`company_name` + `metadata.brand_aliases`).
3. Reuse `callAnthropicApi` with `getModelForFunction('generate-challenge')`, `temperature: 0.8`, `maxTokens: 2200`.
4. Validate (shape + lengths + pillar enum + sanitizer-redaction count logged), then `UPDATE business_challenges SET config_json = jsonb_set(coalesce(config_json,'{}'), ...)` with the merged payload below. One generation per goal/L2-row; subsequent calls overwrite only if `force_regenerate: true`.
5. Audit `challenge.l2_simulation_generated` via `emitAuditEventWithMetric` (mirrors `challenge.l1_generated`).
6. Translation: IT primary now; queue EN/ES via the existing `translate-content` pipeline as a non-blocking post-step (Stage A keeps IT only; EN/ES rows get flagged for translation but the spec stored is the IT one). No locale-specific generation calls — same pattern as L1 mindset.

## Storage contract

Single write to `business_challenges.config_json` (jsonb, already exists, no schema change). Merged shape:

```jsonc
{
  "experience": "l2_conversation",           // ← UI key. Static L2 ignores it.
  "l2_simulation": {
    "version": "1.0",
    "locale": "it",
    "generated_at": "2026-06-06T22:30:00Z",
    "correlation_id": "uuid-…",
    "scenario": "string, 200-600 chars, IT, blind-sanitized, role-specific, set on a Tuesday — the adversarial day",
    "counterpart": {
      "name": "string, plausible first name only (Marco, Elena, …) — never a real client/competitor",
      "role": "string, e.g. 'Direttore Lavori del cantiere autostradale A14'",
      "stance": "antagonista|scettico|ostile|impaziente|tecnico_critico",
      "opening_line": "string, 80-220 chars, IT, in-character first message from the counterpart"
    },
    "curveball": {
      "trigger_turn": 4,                      // integer 3–6, when it fires in the conversation
      "event": "string, 100-300 chars: a concrete worsening event (a third actor escalates, a hard constraint appears, a deadline collapses)"
    },
    "rubric": [
      {
        "criterion": "string, derived 1:1 from a goal requirement (es. 'Lettura di particolari costruttivi sotto pressione')",
        "primary_pillar": "drive|computational_power|communication|creativity|knowledge",
        "weight": 25,                          // integers, sum=100 across 3–5 criteria
        "description": "string, what 'good' looks like in this scenario"
      }
    ]
  }
}
```

The `experience` flag at the top level mirrors L1's `experience: "mindset"` and is the SOLE switch the future UI keys off. Static L2 UI never reads `config_json.experience` today, so it's a no-op for live candidates.

## Generation prompt (verbatim)

System prompt (IT, anchored to the goal context block — same variables L1 already builds):

```
Sei un casting director di simulazioni B2B realistiche. Devi generare il "Martedì peggiore" per il ruolo qui sotto: una scena adversariale in cui il candidato dovrà gestire una conversazione difficile con UN solo interlocutore ostile o critico, nello stesso mondo del ruolo (settore, normative, strumenti, attori reali del mestiere).

CONTESTO RUOLO: ${roleTitle} — ${displayIndustry}
Livello: ${experienceLevel} · Modalità: ${workModel} · Paese: ${country}
RAL indicativa: ${ralMin}-${ralMax} ${currency} · CCNL: ${ccnl ?? "n/d"}
Mansione: ${taskDescription}
Competenze richieste: ${requiredSkills.join(" · ")}
Nice-to-have: ${niceToHave.join(" · ")}

CONTESTO AZIENDA (per tono, NON da nominare):
Cultura: ${teamCulture} · Stile operativo: ${operatingStyle} · Valori: ${coreValues}
Fase: ${growthStage} · Dimensione: ${companySize}

REGOLE FONDAMENTALI:
- VALUTAZIONE ALLA CIECA: NON menzionare MAI il nome dell'azienda committente né nomi reali di clienti, concorrenti, fornitori, partner o brand. Usa descrittori generici ("il principale fornitore", "un cliente strategico nel Nord Italia", "il responsabile della commessa"). Il candidato non deve poter identificare l'azienda.
- La scena è di MARTEDÌ — non lunedì. È il giorno in cui le cose che sembravano gestibili lunedì esplodono. Tono concreto, niente retorica HR, niente "leadership generica".
- Lo scenario DEVE essere SPECIFICO per questo ruolo. Per un Geometra di cantiere parla di ponteggi, POS/PSC, DL, ASL, computi, betoniere, verbali. Per un Production Planner parla di MRP, lead time, fornitori critici, MOQ, stockout, OEE. Mai "kickoff meeting" generico.
- counterpart: UN SOLO interlocutore, con nome di battesimo plausibile italiano (mai cognome, mai brand). Ruolo concreto e settoriale. stance ∈ {antagonista, scettico, ostile, impaziente, tecnico_critico}. opening_line: la prima battuta che dice al candidato, in carattere, 80–220 caratteri, in italiano parlato realistico.
- curveball: un evento che peggiora le cose al turno trigger_turn (intero 3–6). Deve essere un fatto concreto del settore (un ispettore arriva in anticipo, un ordine raddoppia, un componente critico è fuori stock, un cliente cancella). NON una "lezione di vita".
- rubric: 3–5 criteri, ciascuno derivato 1:1 da una competenza richiesta dal goal (required_skills / task_description). Ogni criterio mappa a UN pillar tra: drive, computational_power, communication, creativity, knowledge. Pesi interi che sommano a 100. description: cosa significa "fatto bene" IN QUESTA scena specifica, non in astratto.
- Lingua: Italiano. JSON keys in inglese.

Restituisci SOLO JSON valido con ESATTAMENTE questa forma:
{
  "scenario": "…",
  "counterpart": {"name":"…","role":"…","stance":"…","opening_line":"…"},
  "curveball": {"trigger_turn": 4, "event":"…"},
  "rubric": [
    {"criterion":"…","primary_pillar":"…","weight": 25, "description":"…"}
  ]
}
```

User prompt:
```
Genera il "Martedì peggiore" per ${roleTitle} (${displayIndustry}). Rispondi SOLO con il JSON.
```

## Validation (server-side, before persisting)

- `scenario`: string, 200–600 chars; rejected if contains META markers from L1 path or matches the fallback patterns list.
- `counterpart.stance` ∈ enum; `opening_line` 80–220 chars.
- `curveball.trigger_turn` ∈ [3,6]; `event` 100–300 chars.
- `rubric`: length 3–5; each `primary_pillar` ∈ 5-pillar enum; weights are positive integers summing to exactly 100.
- Sanitizer runs over: `scenario`, `counterpart.role`, `counterpart.opening_line`, `curveball.event`, every `rubric[].criterion` and `rubric[].description`. Redaction count logged with `correlation_id`. If any field fails validation → 422 `INVALID_L2_SIMULATION`, nothing persisted.

## Sample generated spec — current test goal

Goal `eab2f3b2-fd0a-4bc5-9ef4-ceab67cdbbf3` (Project Engineer, IT, livello independent, settore Edilizia/Infrastrutture — based on the live `hiring_goal_drafts` row). Representative output the prompt should produce; final spec will be re-generated live for your review on first call:

```json
{
  "experience": "l2_conversation",
  "l2_simulation": {
    "version": "1.0",
    "locale": "it",
    "scenario": "Martedì mattina, 7:40. Sei in cantiere su un lotto autostradale del centro Italia. Il getto del muro di sostegno previsto per le 9:00 dipende da una betoniera che il fornitore aveva confermato lunedì sera. Alle 7:20 il capo squadra ti dice che la pompa è guasta e il fornitore di riserva può consegnare solo nel pomeriggio. Alle 7:35 il Direttore dei Lavori arriva in anticipo, vede gli operai fermi e chiede spiegazioni davanti a tutti. Hai un POS aggiornato lunedì che NON prevedeva la sostituzione del mezzo, e il computo metrico è già stato presentato alla committente.",
    "counterpart": {
      "name": "Marco",
      "role": "Direttore dei Lavori del lotto autostradale",
      "stance": "tecnico_critico",
      "opening_line": "Allora, mi spieghi perché trovo gli operai fermi in cantiere a quest'ora? Lunedì mi avevi garantito che il getto partiva alle nove."
    },
    "curveball": {
      "trigger_turn": 4,
      "event": "Al quarto scambio, un ispettore ASL si presenta per un controllo a campione e chiede di vedere il POS aggiornato per la lavorazione di oggi e la documentazione del nuovo mezzo. Hai 10 minuti."
    },
    "rubric": [
      { "criterion": "Lettura tecnica di vincoli di cantiere sotto pressione",
        "primary_pillar": "knowledge", "weight": 25,
        "description": "Cita POS/PSC, sequenza getto, alternative tecniche realistiche (autobetoniera con pompa autonoma, posticipo parziale del getto)." },
      { "criterion": "Comunicazione con figura tecnica ostile",
        "primary_pillar": "communication", "weight": 30,
        "description": "Non si giustifica, riconosce il fatto, propone un piano in 2-3 mosse concrete senza scaricare sul fornitore." },
      { "criterion": "Decisione operativa con dati incompleti",
        "primary_pillar": "computational_power", "weight": 25,
        "description": "Sceglie tra rinviare il getto, parzializzarlo o cambiare fornitore valutando impatto su computo e cronoprogramma." },
      { "criterion": "Tenuta sotto escalation imprevista (ispettore ASL)",
        "primary_pillar": "drive", "weight": 20,
        "description": "Non si blocca al curveball, gestisce DL e ispettore in parallelo, propone documentazione aggiornata in tempi credibili." }
    ]
  }
}
```

## Files touched (Stage A only)

- `supabase/functions/generate-challenge/index.ts` — add `level: 2` branch, new `generateL2SimulationBlock(ctx)`, new `validateL2Simulation(parsed)`, reuse `buildBlindSanitizer`, persist to `business_challenges.config_json`, emit audit event.

No frontend, no migration, no other functions, no scorer.

## Rollback / safety

- Feature is OFF for candidates: the static L2 UI continues to render today's "System Design con Vincoli" template. The new `config_json.experience = "l2_conversation"` flag is the kill-switch; until Stage B reads it, nothing changes for any candidate.
- One row per L2 challenge. If generation fails (LLM error, validation reject, sanitizer redaction over a threshold to be defined in Stage A code = >5 hits), the row is left without `l2_simulation` and a `correlation_id` is logged. The challenge remains usable on the old template.

## Validation steps after Stage A ships

1. Trigger generation on the Project Engineer test goal → confirm `config_json.l2_simulation` lands with the shape above, `experience: "l2_conversation"` set.
2. Manual content review of the live-generated spec (you sign off before Stage B).
3. Open the candidate L2 page → confirm the static "System Design con Vincoli" UI still renders, untouched.
4. Re-trigger with `force_regenerate: true` → confirm overwrite; without it → no-op.

Awaiting approval before switching to build mode.
