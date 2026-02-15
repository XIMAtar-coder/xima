# XIMA Drive MC — Synthetic Stress-Test Report v1

**Date:** 2026-02-15  
**Version:** 1.1  
**Pillar:** Drive (Growth Velocity)  
**Status:** APPROVED WITH MONITORING

---

## Executive Summary

A synthetic psychometric stress-test (N = 4,000; 1,000 per field) was conducted on the 16 Drive MC questions (4 per field × 4 fields). Six behavioural archetypes were simulated with weighted population distribution and 7.5% response noise.

**Key findings:**
- Mean scaled score: **50.2** (well-centred)
- Standard deviation: **22.0** (adequate spread)
- Cronbach's alpha: **0.624** (acceptable for 4-item baseline)
- Ceiling effect (≥90): **2.8%** (well under 10% threshold)
- Floor effect (≤10): **2.6%** (well under 10% threshold)
- Archetype separability: **Strong** (Cohen's d > 2.0 for extreme pairs)

The Drive MC bank is **psychometrically functional** as a behavioural baseline proxy. True Drive remains a longitudinal metric.

---

## Simulation Design

### Archetypes & Weights

| Archetype | Weight | Response Profile (P₀/P₁/P₂/P₃) | Expected Score |
|---|---|---|---|
| Weakness-Avoider | 20% | 0.45 / 0.30 / 0.15 / 0.10 | 30.0 |
| Growth-Intentional | 20% | 0.10 / 0.25 / 0.40 / 0.25 | 60.0 |
| Overconfident-Static | 10% | 0.05 / 0.15 / 0.25 / 0.55 | 76.7 |
| Feedback-Seeker | 15% | 0.30 / 0.35 / 0.25 / 0.10 | 38.3 |
| Reactive-Improver | 20% | 0.20 / 0.40 / 0.25 / 0.15 | 45.0 |
| Strategic-Learner | 15% | 0.10 / 0.20 / 0.35 / 0.35 | 65.0 |

**Noise model:** 7.5% uniform random reassignment per response.

---

## Field-by-Field Findings

All four fields (science_tech, business_leadership, arts_creative, service_ops) share identical scoring structure. Under this simulation model, statistical properties are field-invariant. Real data will introduce field-specific variance from content difficulty.

### Distribution Statistics (per field, N = 1,000)

| Metric | Value |
|---|---|
| Mean | 50.2 |
| SD | 22.0 |
| Skewness | +0.12 (near-symmetric) |
| Kurtosis | 2.34 (platykurtic — flatter than normal) |
| Min/Max | 0 / 100 |
| % above 85 | 4.1% |
| % below 20 | 5.8% |
| Ceiling (≥90) | 2.8% ✓ |
| Floor (≤10) | 2.6% ✓ |

### Item-Level Analysis

| Item | Mean | Variance | Discrimination | Option Freq (A/B/C/D) |
|---|---|---|---|---|
| q5 | 1.505 | 1.747 | 0.42 | 22.8% / 28.9% / 27.6% / 20.7% |
| q10 | 1.505 | 1.747 | 0.42 | 22.8% / 28.9% / 27.6% / 20.7% |
| q15 | 1.505 | 1.747 | 0.42 | 22.8% / 28.9% / 27.6% / 20.7% |
| q20 | 1.505 | 1.747 | 0.42 | 22.8% / 28.9% / 27.6% / 20.7% |

**Note:** Synthetic items show identical statistics because archetypes apply the same response model to all items. Real data will reveal content-specific differentiation.

**Item discrimination index (0.42):** Moderate-to-good. Values > 0.30 are considered acceptable; > 0.40 is good for short scales.

---

## Internal Consistency

**Cronbach's α = 0.624**

| Benchmark | Threshold | Status |
|---|---|---|
| Minimum acceptable | 0.60 | ✓ Met |
| Good | 0.70 | ✗ Below |
| Excellent | 0.80 | ✗ Below |

**Interpretation:** Acceptable for a 4-item behavioural proxy. Alpha is mathematically constrained by item count — with 6 items, projected α ≈ 0.72. Since true Drive is computed longitudinally, this MC alpha represents a lower bound on measurement precision.

---

## Archetype Separability

### Mean Scores (Ranked)

```
Weakness-Avoider       ████████░░░░░░░░░░░░  30.0
Feedback-Seeker        ████████████░░░░░░░░  38.3
Reactive-Improver      █████████████░░░░░░░  45.0
Growth-Intentional     ████████████████████  60.0
Strategic-Learner      █████████████████████  65.0
Overconfident-Static   ██████████████████████████  76.7
```

### Effect Sizes (Cohen's d)

| Pair | d | Interpretation |
|---|---|---|
| Weakness-Avoider ↔ Overconfident-Static | 2.95 | Very large |
| Weakness-Avoider ↔ Strategic-Learner | 2.13 | Very large |
| Weakness-Avoider ↔ Growth-Intentional | 1.88 | Large |
| Growth-Intentional ↔ Overconfident-Static | 1.09 | Large |
| Reactive-Improver ↔ Growth-Intentional | 0.95 | Large |
| Feedback-Seeker ↔ Reactive-Improver | 0.41 | Small-medium |

### Overlap Zones

- **Feedback-Seeker ↔ Reactive-Improver:** Moderate overlap in 35–50 band. Differentiation relies on longitudinal Drive velocity.
- **Growth-Intentional ↔ Strategic-Learner:** Moderate overlap in 55–70 band. Both are growth-oriented; separated by systems-thinking dimension.
- **Overconfident-Static scores highest on MC** but would score lowest on longitudinal Drive (no actual improvement). This validates the two-stage design.

---

## Stress Tests

### Test 1: High Noise (20% uniform reassignment)

| Metric | Baseline | High Noise | Delta |
|---|---|---|---|
| Mean | 50.2 | 50.1 | −0.1 |
| SD | 22.0 | 18.4 | −3.6 |
| Alpha | 0.624 | 0.49 | −0.134 |
| Ceiling % | 2.8 | 1.5 | −1.3 |

**Verdict:** Degraded but functional. Alpha drops below minimum threshold. Noise > 15% compresses discrimination.

### Test 2: 70% Weakness-Avoider Population

| Metric | Baseline | Skewed WA | Delta |
|---|---|---|---|
| Mean | 50.2 | 37.6 | −12.6 |
| SD | 22.0 | 17.8 | −4.2 |
| Alpha | 0.624 | 0.58 | −0.044 |
| Floor % | 2.6 | 7.8 | +5.2 |

**Verdict:** Compressed but valid. Floor risk approaches threshold but does not breach. Most candidates cluster in 25–45 band.

### Test 3: 70% Strategic-Learner Population

| Metric | Baseline | Skewed SL | Delta |
|---|---|---|---|
| Mean | 50.2 | 59.8 | +9.6 |
| SD | 22.0 | 16.2 | −5.8 |
| Alpha | 0.624 | 0.59 | −0.034 |
| Ceiling % | 2.8 | 4.7 | +1.9 |

**Verdict:** Stable. Ceiling risk elevated but within tolerance. Distribution shifted but functional.

### Stability Summary

No stress scenario triggers ceiling or floor threshold violations. Alpha remains ≥ 0.49 even under extreme conditions. Mean is robust (range 37.6–59.8).

---

## Strengths

1. **Well-centred distribution** — mean 50.2 avoids systematic bias
2. **No ceiling/floor violations** — even under extreme population skew
3. **Strong extreme-archetype separation** — d > 1.8 for WA vs GI/SL
4. **Designed redundancy** — Overconfident-Static scores high on MC but low on longitudinal Drive, validating the two-stage measurement
5. **Balanced option selection** — no dominant option across population (range 20.7%–28.9%)

## Weaknesses

1. **α = 0.624 is borderline** — 4 items limit reliability; expanding to 6 items would project α ≈ 0.72
2. **Adjacent archetype overlap** — FS ↔ RI and GI ↔ SL overlap zones require longitudinal data for disambiguation
3. **Positional scoring assumes equidistance** — score values 0-1-2-3 treat all option gaps as equal; IRT would capture non-linear discrimination
4. **Synthetic uniformity across fields** — all fields show identical statistics; real data will reveal content-specific item difficulty
5. **Item redundancy risk** — identical discrimination indices suggest items may not capture distinct sub-facets of Drive behaviour

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Low alpha (0.624) | Medium | Acceptable for baseline proxy; true Drive is longitudinal |
| Adjacent archetype confusion | Medium | Resolved by longitudinal velocity computation |
| Overconfident-Static scores high | Low (by design) | Two-stage system catches this; MC is proxy only |
| Field-specific item difficulty unknown | Medium | Monitor per-field statistics after N ≥ 200 real responses |
| Positional scoring limitations | Low | IRT calibration recommended at N ≥ 500 |

---

## Recommendations

### Immediate (Pre-Freeze)

- ✅ **APPROVED FOR FREEZE** — Drive MC meets minimum psychometric standards for a 4-item behavioural baseline proxy
- ⚠️ **MONITORING REQUIRED** — Track real-world alpha, item discrimination, and field-specific variance

### Post-Launch (N ≥ 500)

1. **Compute empirical Cronbach's α per field** — verify ≥ 0.60
2. **Run IRT 2PL model** — estimate item discrimination and difficulty parameters
3. **Check differential item functioning (DIF)** — compare across languages (EN/IT/ES)
4. **Validate Overconfident-Static detection** — confirm MC-high + longitudinal-low pattern in real data
5. **Consider expanding to 6 items** if alpha < 0.60 empirically

### Long-Term

- Explore adaptive item selection if assessment expands beyond 21 questions
- Consider adding reverse-scored Drive items to detect acquiescence bias
- Build empirical archetype profiles from real response clusters (k-means on Drive MC vectors)

---

## Limitations of This Analysis

1. **Synthetic data cannot replace empirical validation** — archetype profiles are expert-designed heuristics
2. **Item-level independence assumption** — real responses exhibit inter-item correlation from shared scenario framing
3. **Field-invariant statistics** — real data will show content-specific difficulty and discrimination differences
4. **Noise model is simplified** — real response noise is systematically biased (social desirability, fatigue, language effects)
5. **N = 1,000 synthetic** is sufficient for distributional analysis but does not constitute psychometric norming

---

## Final Verdict

### **APPROVED WITH MONITORING**

The Drive MC bank demonstrates adequate psychometric properties for deployment as a behavioural baseline proxy within the XIMA v1.1 framework. Key strengths include meaningful archetype differentiation, absence of ceiling/floor effects, and deliberate design redundancy (MC baseline + longitudinal velocity). The primary limitation — moderate reliability (α = 0.624) — is inherent to the 4-item constraint and mitigated by the longitudinal Drive computation.

**Recommended monitoring triggers:**
- Empirical α < 0.55 → Consider item revision
- Ceiling effect > 8% → Investigate score compression
- Single-item discrimination < 0.25 → Flag for replacement
- Cross-language DIF > 0.5 logits → Review translation equivalence

---

*Report generated for external validation by psychometric reviewers, AI validators, and assessment experts.*  
*Source data: `XIMA_Drive_MC_Synthetic_StressTest_v1.json`*
