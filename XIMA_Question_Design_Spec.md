# XIMA Question Design Spec

## 1 — Pillars: Definitions

| Pillar | Is | Is NOT | Target Signals | Anti-patterns |
|---|---|---|---|---|
| **Computational Power** | Ability to decompose, model, and systematise complex information into actionable structure | Raw IQ, math skill, or tool proficiency | Breaks ambiguity into steps · Chooses appropriate abstraction level · Detects patterns across noisy data · Evaluates trade-offs quantitatively · Builds repeatable frameworks | Questions that test tool knowledge ("Do you use Excel?") or have one objectively correct answer |
| **Communication** | Capacity to adapt message, medium, and listening to the audience and context | Extroversion, charisma, or presentation polish | Adjusts technical depth per audience · Confirms understanding actively · Resolves conflict through dialogue · Synthesises group input · Writes for clarity not volume | Questions that reward verbosity or conflate "communicates a lot" with "communicates well" |
| **Knowledge** | Discipline of acquiring, validating, organising, and transferring domain expertise | Memorised facts, years of experience, or credentials | Cross-references sources before deciding · Maintains structured documentation · Identifies knowledge gaps proactively · Transfers knowledge to others · Updates mental models when evidence changes | Trivia questions or "how many years have you…" proxies |
| **Creativity** | Ability to generate, connect, and test novel ideas under real constraints | Artistic talent, divergent thinking alone, or "thinking outside the box" cliché | Combines ideas from unrelated domains · Iterates from prototype to solution · Balances novelty with feasibility · Reframes problems before solving · Produces multiple options before committing | Questions where "the creative answer" is obvious; options that lack constraint tension |
| **Drive** | **Growth Velocity** — rate of improvement on weakest skills over time | Static motivation, grit, ambition, or work ethic | Seeks feedback on weak areas · Sets learning goals (not just performance goals) · Adapts strategy after failure · Maintains effort when novelty fades · Tracks own progress honestly | Questions measuring ambition ("Do you want to be a leader?") or self-reported persistence |

## 2 — Question Design Rules

### MC Questions
- **Force trade-offs**: each option must sacrifice something; no "all of the above" or universally desirable answer.
- **Situational stem**: describe a concrete scenario, not an abstract trait ("When X happens, you…" not "Are you a person who…").
- **No social desirability gradient**: randomise the "best-sounding" position across options; pilot-test with desirability ratings.

### Option Design (4 options per question)
- Options represent **4 distinct approaches**, not 4 quality levels of the same approach.
- Each option should be defensible — a reasonable professional could prefer it.
- Avoid negatively worded options ("I never…") which bias selection.

### Field Adaptation
The same pillar manifests differently per field. Questions must reflect this.

| Pillar | science_tech example | service_ops example |
|---|---|---|
| Computational Power | "Faced with conflicting model outputs, you…" | "When two SOPs produce different quality scores, you…" |
| Communication | "Presenting a technical risk to a non-technical sponsor…" | "Explaining a service disruption to an upset client…" |

All 4 fields must have **field-specific scenarios**; never reuse the same stem across fields.

### i18n Rules
- The `category` label in i18n **must** use the exact display name for the pillar (e.g. "Computational Power" EN / "Potenza Computazionale" IT).
- The scoring `pillar` key **must** be the canonical enum (`computational_power`). These two are linked by `getPillarForQuestion()` — never hardcode a separate mapping.

## 3 — Scoring Principles

### MC → Pillar Score
- Each option maps to a **fixed ordinal value** (0–3). No randomness, no jitter in production.
- Score per pillar = mean of all answers in that pillar, scaled to 0–100.
- Distribution target: population mean ≈ 55, σ ≈ 15. If pilot data clusters above 80, questions lack discrimination — redesign.

### Open Answers (10% blend)
- Rubric dimensions: **Length adequacy · Field relevance · Structure · Specificity · Action orientation** (0–100 total).
- open1 → 60% Creativity + 40% Communication. open2 → 60% Drive + 40% Knowledge.
- AI scoring must return structured JSON; fallback to deterministic heuristic if AI fails.
- Scores must be **explainable**: users see dimension breakdown, not just a number.

### Transparency vs. Gameability
- Show users their pillar profile and relative strengths — never show raw option weights.
- Explain what each pillar means in their context; do not reveal which option scores highest.

## 4 — Quality Checklist (Release Gate)

Before any question set goes live, verify:

- [ ] **Clarity**: 5 naive readers understand the stem without clarification
- [ ] **Bias**: no option is > 2× more socially desirable than others (pilot N ≥ 20)
- [ ] **Distinguishability**: options are meaningfully different (no two options paraphrase each other)
- [ ] **Pillar purity**: each question loads on exactly one pillar; no cross-loading
- [ ] **Field relevance**: scenario is realistic for that work field (reviewed by 1 domain SME)
- [ ] **i18n alignment**: `category` label in all locales maps to correct `pillar` enum via `getPillarForQuestion()`
- [ ] **Score calibration**: pilot run (N ≥ 50) produces mean 50–65, σ 12–20 per pillar
- [ ] **No ceiling effect**: < 10% of pilot respondents score > 90 on any pillar
