# XIMA Question Design Spec v1.1

**Version**: 1.1 | **Status**: Release Gate (locked)  
**Last updated**: 2026-02-11 | **Changelog**: Added XIMA Assessment Philosophy, Drive Question Constraint, Cognitive Tension Rule

---

## 1 — Pillars: Definitions

| Pillar | Is | Is NOT | Target Signals | Anti-patterns |
|---|---|---|---|---|
| **Computational Power** | Ability to decompose, model, and systematise complex information into actionable structure | Raw IQ, math skill, or tool proficiency | Breaks ambiguity into steps · Chooses appropriate abstraction level · Detects patterns across noisy data · Evaluates trade-offs quantitatively · Builds repeatable frameworks | Questions that test tool knowledge ("Do you use Excel?") or have one objectively correct answer |
| **Communication** | Capacity to adapt message, medium, and listening to the audience and context | Extroversion, charisma, or presentation polish | Adjusts technical depth per audience · Confirms understanding actively · Resolves conflict through dialogue · Synthesises group input · Writes for clarity not volume | Questions that reward verbosity or conflate "communicates a lot" with "communicates well" |
| **Knowledge** | Discipline of acquiring, validating, organising, and transferring domain expertise | Memorised facts, years of experience, or credentials | Cross-references sources before deciding · Maintains structured documentation · Identifies knowledge gaps proactively · Transfers knowledge to others · Updates mental models when evidence changes | Trivia questions or "how many years have you…" proxies |
| **Creativity** | Ability to generate, connect, and test novel ideas under real constraints | Artistic talent, divergent thinking alone, or "thinking outside the box" cliché | Combines ideas from unrelated domains · Iterates from prototype to solution · Balances novelty with feasibility · Reframes problems before solving · Produces multiple options before committing | Questions where "the creative answer" is obvious; options that lack constraint tension |
| **Drive** | **Growth Velocity** — rate of improvement on weakest skills over time | Static motivation, grit, ambition, or work ethic | Seeks feedback on weak areas · Sets learning goals (not just performance goals) · Adapts strategy after failure · Maintains effort when novelty fades · Tracks own progress honestly | Questions measuring ambition ("Do you want to be a leader?") or self-reported persistence |

---

## 2 — XIMA Assessment Philosophy (Weakness-First)

The XIMA assessment is **development-oriented, not labelling-oriented**. It exists to surface growth opportunities, not to rank candidates or predict success.

- **Current state, not potential**: we measure how someone operates right now under realistic constraints, not their theoretical capacity.
- **Weakness-first lens**: primary output is identifying the **2 pillars with the lowest scores** and highest growth leverage.
- **Avoid ceiling flattery**: questions and scoring should not reward already-dominant traits; instead, they should expose friction areas where learning is possible.
- **Dynamic behaviours**: all 5 pillars are trainable, improvable operating strategies — not fixed traits or talents.
- **No maturity ranking**: there is no "best" pillar profile; only **trade-offs**. A high-Creativity / low-Knowledge profile is legitimate, not deficient.

**Impact on question design**: Scenarios must include realistic constraints, setbacks, or ambiguity. Questions that reward "the mature answer" or optimise for social desirability fail this gate.

---

## 3 — Drive Question Constraint (Growth Velocity, Not Motivation)

Drive measures **learning behaviour under friction**, not ambition, grit, or persistence rhetoric.

**MC Drive Questions must**:
- **Include friction**: the scenario must feature failure, constraint, resistance, delay, ambiguity, or skill mismatch.
- **Measure learning response**: option differences should reflect how the person *adapts strategy* after setback (not whether they "keep trying").
- **Avoid identity statements**: reject questions phrased as "I am the kind of person who…" or "I see myself as someone who…".
- **Avoid career aspiration proxies**: "Do you want to be a leader?" or "Do you aim to be promoted?" do not measure Drive.
- **Avoid persistence clichés**: "I push through challenges" or "I never give up" are self-report noise, not observable behavior.

**Clarification**: Drive MC questions are *proxies for observable learning velocity*. They cannot predict future improvement; they describe current strategy under setback. Open answers (open2, 60% Drive blend) provide richer context on actual growth intention.

---

## 4 — Cognitive Tension Rule (Trade-Offs)

**Every MC question must encode a meaningful trade-off between two legitimate professional strategies.**

No option should be universally "more mature" or "best practice." Instead, options should reflect different but defensible priorities.

**Allowed tension pairs** (non-exhaustive):
- Structure vs. Flexibility (prescriptive process vs. adaptive response)
- Depth vs. Speed (thorough analysis vs. timely decision)
- Exploration vs. Exploitation (learning new approaches vs. optimising known ones)
- Agency vs. Alignment (independent judgment vs. team consensus)
- Risk vs. Validation (moving fast vs. building confidence first)

**Failure condition**: if one option is clearly "the mature answer" or "best practice," the question fails the cognitive tension gate. Redesign or remove.

---

## 5 — Question Design Rules

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

---

## 6 — Scoring Principles

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

---

## 7 — Quality Checklist (Release Gate)

Before any question set goes live, verify **all** of the following:

### Core Clarity & Bias
- [ ] **Clarity**: 5 naive readers understand the stem without clarification
- [ ] **Bias**: no option is > 2× more socially desirable than others (pilot N ≥ 20)
- [ ] **Distinguishability**: options are meaningfully different (no two options paraphrase each other)

### Pillar & Field Integrity
- [ ] **Pillar purity**: each question loads on exactly one pillar; no cross-loading
- [ ] **Field relevance**: scenario is realistic for that work field (reviewed by 1 domain SME)
- [ ] **i18n alignment**: `category` label in all locales maps to correct `pillar` enum via `getPillarForQuestion()`

### XIMA Principles (v1.1 Gates)
- [ ] **Weakness-first**: assessment output highlights bottom-2 pillars + recommended improvement focus (not top strengths)
- [ ] **Drive MC validity**: all Drive questions include friction scenario; measure learning response, not motivation; no identity or aspiration proxies
- [ ] **Cognitive tension**: each MC question passes trade-off test; no option is universally "more mature"

### Score Calibration
- [ ] **Score calibration**: pilot run (N ≥ 50) produces mean 50–65, σ 12–20 per pillar
- [ ] **No ceiling effect**: < 10% of pilot respondents score > 90 on any pillar

---

## Changelog v1.1

**Added sections**:
- **XIMA Assessment Philosophy**: weakness-first orientation, current-state measurement, dynamic behaviours
- **Drive Question Constraint**: explicit rules that Drive measures learning velocity under friction, not motivation
- **Cognitive Tension Rule**: all MC questions must encode defensible trade-offs; failure if one option is "best practice"
- **Updated Release Gate**: added 3 new gates (weakness-first output, Drive MC validity, cognitive tension pass/fail)

**No changes to**:
- Pillar definitions (same 5 pillars, same anti-patterns)
- Question design rules (MC, option design, field adaptation, i18n rules unchanged)
- Scoring principles (MC ordinal mapping, open answer blending 10%, transparency rules unchanged)
- Core checklist items (clarity, bias, distinguishability, purity, field relevance, calibration, ceiling effect)

**Why v1.1**: formalizes the XIMA difference (weakness-first, learning-velocity, trade-off thinking) as *locked release gates*, not aspirational guidance. All future question writing must satisfy these 3 gates explicitly.
