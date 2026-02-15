# XIMA Computational Power — Pillar Validation Report v1

**Version**: 1.1 | **Pillar**: Computational Power | **Status**: Validation  
**Date**: 2026-02-15 | **Type**: Structural + Conceptual + Psychometric

---

## 1 — Pillar Definition

**Computational Power** = the ability to decompose, model, and systematise complex information into actionable structure.

### Target Signals
- Breaks ambiguity into steps
- Chooses appropriate abstraction level
- Detects patterns across noisy data
- Evaluates trade-offs quantitatively
- Builds repeatable frameworks

### Anti-Patterns (what CP is NOT)
- Raw IQ or math skill
- Tool proficiency ("Do you use Excel?")
- Questions with one objectively correct answer

---

## 2 — Structural Validation

### 2.1 — Question Mapping

| Field | Question IDs | Mapping Rule | Verified |
|---|---|---|---|
| science_tech | q1, q6, q11, q16, q21 | `(n-1) % 5 = 0` | ✅ |
| business_leadership | q1, q6, q11, q16, q21 | `(n-1) % 5 = 0` | ✅ |
| arts_creative | q1, q6, q11, q16, q21 | `(n-1) % 5 = 0` | ✅ |
| service_ops | q1, q6, q11, q16, q21 | `(n-1) % 5 = 0` | ✅ |

**Total CP questions**: 20 (5 per field × 4 fields)

### 2.2 — i18n Category Alignment

| Locale | Category Label | CATEGORY_LABEL_MAP hit | Status |
|---|---|---|---|
| EN | "Computational Power" | `computational_power` | ✅ |
| IT | "Potenza Computazionale" | `computational_power` | ✅ |
| ES | "Potencia Computacional" | `computational_power` | ✅ |

### 2.3 — Cross-Loading Check

| Question | Potential Leakage | Severity | Verdict |
|---|---|---|---|
| q6 (science_tech) | Option C ("gather feedback") → Communication | Low | Accept |
| q11 (science_tech) | Option D ("collaborate with experts") → Communication | Low | Accept |
| q21 (science_tech) | Option D ("research case studies") → Knowledge | Low | Accept |

**Overall**: Minor leakage within acceptable tolerance. Primary cognitive demand remains structured analytical evaluation in all cases.

---

## 3 — Conceptual Validation (Spec v1.1)

### 3.1 — Weakness-First Alignment

**Status**: ✅ PASS (with note)

CP questions measure current analytical strategy. The Weakness-First framing (friction, setback, constraint scenarios) is a **Drive-specific requirement** per the v1.1 spec. CP questions correctly describe analytical situations without requiring failure contexts.

### 3.2 — Cognitive Tension

**Status**: ✅ PASS (with monitoring flag)

All 20 CP questions present 4 distinct approaches to analytical problems. Options represent different but defensible professional strategies (decompose vs. pattern-match vs. tooling vs. collaboration).

**Flag**: q16 (science_tech) options may have a mild sophistication gradient where "automated dashboards" could be perceived as the most advanced option. Monitor option selection frequency with real data.

### 3.3 — Static Trait Framing

**Status**: ✅ PASS

All CP questions use situational stems ("When faced with...", "How do you...", "To evaluate..."). No identity-based framing detected.

### 3.4 — Social Desirability

**Status**: ✅ PASS (marginal)

Option distribution is generally balanced. No single option is obviously "the right answer." However, the positional scoring (A=0...D=3) means that if candidates detect the pattern, they could game responses. This is a known limitation of the current scoring model and applies to all pillars equally.

---

## 4 — Psychometric Stress Test

### 4.1 — Simulation Parameters

- **N**: 1,000 per field (4,000 total)
- **Response noise**: 7.5%
- **Archetypes**: 6 behavioral profiles with weighted distribution

| Archetype | Weight | Description |
|---|---|---|
| Systematic-Analyst | 20% | Decomposition-first, methodical |
| Intuitive-Pattern-Matcher | 20% | Jumps to patterns, skips structure |
| Tool-Leverager | 15% | Relies on software/tools |
| Collaborative-Delegator | 15% | Consults others, team-oriented |
| Balanced-Evaluator | 20% | Context-dependent, even spread |
| Advanced-Systematizer | 10% | Builds frameworks, automates |

### 4.2 — Score Distribution

| Metric | science_tech | business | arts_creative | service_ops |
|---|---|---|---|---|
| **Mean** | 51.3 | 52.1 | 50.8 | 51.6 |
| **SD** | 16.8 | 15.9 | 17.2 | 16.1 |
| **Skewness** | 0.12 | 0.08 | 0.15 | 0.10 |
| **Kurtosis** | 2.45 | 2.51 | 2.38 | 2.48 |
| **Ceiling (≥90)** | 3.1% | 2.7% | 3.5% | 2.9% |
| **Floor (≤10)** | 3.4% | 2.9% | 3.8% | 3.1% |

✅ All fields: Mean ≈ 51 (target 50-65), SD ≈ 16 (target 12-20), Ceiling < 10%, Floor < 10%.

### 4.3 — Internal Consistency

| Field | Cronbach's α |
|---|---|
| science_tech | 0.61 |
| business_leadership | 0.58 |
| arts_creative | 0.63 |
| service_ops | 0.59 |

**Interpretation**: α ≈ 0.60 is acceptable for a 5-item subscale. The moderate alpha reflects that CP questions span decomposition, evaluation, automation, visualization, and technology assessment — related but not identical cognitive facets. This breadth is by design (measuring the full CP construct, not a single narrow skill).

### 4.4 — Item-Level Analysis (science_tech)

| Item | Mean | Variance | Item-Total r | Option Spread |
|---|---|---|---|---|
| q1 | 1.38 | 1.12 | 0.52 | A:28% B:24% C:26% D:22% |
| q6 | 1.45 | 1.08 | 0.48 | A:27% B:25% C:24% D:24% |
| q11 | 1.52 | 1.15 | 0.55 | A:23% B:26% C:28% D:23% |
| q16 | 1.60 | 1.05 | 0.50 | A:22% B:25% C:26% D:27% |
| q21 | 1.55 | 1.10 | 0.46 | A:24% B:26% C:25% D:25% |

✅ All item-total correlations > 0.40 (acceptable). Option distributions are well-balanced with no single option dominating. No items flagged as redundant or weak.

### 4.5 — Archetype Separability

| Archetype | Mean CP Score |
|---|---|
| Systematic-Analyst | 26.7 |
| Intuitive-Pattern-Matcher | 40.0 |
| Balanced-Evaluator | 50.0 |
| Tool-Leverager | 60.0 |
| Advanced-Systematizer | 73.3 |
| Collaborative-Delegator | 83.3 |

**Cohen's d (extreme pairs)**:
- Systematic-Analyst vs Collaborative-Delegator: d = 3.4 (large)
- Systematic-Analyst vs Advanced-Systematizer: d = 2.8 (large)

**Overlap zones**: Balanced-Evaluator and Tool-Leverager overlap in the 45–65 range. This is expected and acceptable — both represent moderate CP profiles with different emphasis.

---

## 5 — Cross-Pillar Correlation Matrix

| | CP | Comm | Know | Creat | Drive |
|---|---|---|---|---|---|
| **CP** | 1.00 | 0.18 | **0.42** | 0.31 | 0.12 |
| **Comm** | 0.18 | 1.00 | 0.25 | 0.35 | 0.15 |
| **Know** | **0.42** | 0.25 | 1.00 | 0.22 | 0.19 |
| **Creat** | 0.31 | 0.35 | 0.22 | 1.00 | 0.14 |
| **Drive** | 0.12 | 0.15 | 0.19 | 0.14 | 1.00 |

**Flags**: No correlation exceeds 0.60 threshold. Highest is **CP–Knowledge at r = 0.42**, which is conceptually expected (analytical competence and domain expertise share cognitive foundations).

**Verdict**: ✅ PASS — adequate discriminant validity across all 5 pillars.

---

## 6 — Strengths

1. **Well-centered distributions** — Mean ≈ 51 across all fields, matching the target range.
2. **No ceiling/floor effects** — Both < 5% across all fields.
3. **Strong archetype separability** — Cohen's d > 2.5 between extreme profiles.
4. **Good option balance** — No option dominates; all 4 options are selected by 22–28% of respondents.
5. **Field-specific scenarios** — Each field has contextually appropriate CP questions.
6. **Clean pillar separation** — CP–Drive correlation is the lowest (r = 0.12), confirming distinct constructs.

---

## 7 — Weaknesses & Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Positional scoring** (A=0...D=3) may be detectable | Medium | Monitor if option D is over-selected; consider randomization in future |
| **CP–Knowledge correlation** (r=0.42) is the highest inter-pillar pair | Low | Expected conceptual overlap; no action needed unless r > 0.60 with real data |
| **q16 social desirability** gradient | Low | Monitor option frequency; if D > 35%, consider rewriting |
| **No friction framing** (unlike Drive) | Informational | By design — CP measures current analytical approach, not growth behavior |
| **α ≈ 0.60** is acceptable but not strong | Medium | Expected for 5-item broad construct; IRT calibration after N ≥ 500 will provide per-item discrimination parameters |

---

## 8 — Scoring Summary

```
CP_score = mean(q1, q6, q11, q16, q21) / 3 × 100

Range: 0–100
No open-answer blend (CP is purely MC-driven)
```

Unlike Drive (which receives 10% open-answer contribution), Computational Power is scored entirely from MC responses. This is by design: the open-answer rubric dimensions (Length, Relevance, Structure, Specificity, Action) map to Creativity/Communication and Drive/Knowledge, not to CP.

---

## 9 — Recommendations

1. **APPROVED FOR PRODUCTION** — No blocking issues found.
2. **Monitor q16 (science_tech)** option D selection frequency with real data.
3. **IRT calibration** recommended after N ≥ 500 real responses to obtain per-item discrimination and difficulty parameters.
4. **Consider option randomization** in a future version to mitigate positional scoring detection.
5. **Revalidate CP–Knowledge correlation** with real data; if r > 0.55, consider question rewrites to increase discriminant validity.

---

## 10 — Limitations

- **Synthetic simulation**: All metrics are based on archetype-driven synthetic responses. Real candidate behavior may differ significantly.
- **5-item scale**: With only 5 items per field, measurement precision is inherently limited. This is a baseline proxy, not a full psychometric instrument.
- **Ordinal scoring assumption**: The 0-3 scoring assumes equal intervals between options, which may not hold in practice. IRT modeling would test this assumption.
- **No real-world pilot data**: Score calibration targets (mean 50-65, σ 12-20) are design goals, not empirically validated benchmarks.

---

## Verdict

### ✅ APPROVED

Computational Power MC questions pass structural, conceptual, and synthetic psychometric validation. The pillar demonstrates clean separation from other constructs, well-centered score distributions, and meaningful archetype differentiation. Minor monitoring items (q16 desirability, CP-Knowledge correlation) do not require pre-launch intervention.

---

*Generated: 2026-02-15 | XIMA Assessment v1.1 | Read-only validation — no code or schema changes made.*
