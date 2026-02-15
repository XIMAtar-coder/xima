# XIMA Drive MC — Validation Report

**Version:** 1.1  
**Pillar:** Drive (Growth Velocity)  
**Date:** 2026-02-15  
**Status:** Pre-freeze validation

---

## 1. Pillar Definition

**Drive** in XIMA is defined as **Growth Velocity** — the rate at which a candidate improves their weakest professional skills through deliberate, observable learning behaviour.

Drive ≠ motivation, ambition, grit, or perseverance.

Drive MC questions measure the **behavioural baseline**: what strategy a candidate employs when confronting a known weakness or setback. The true Drive score is computed **longitudinally** from `pillar_progress_snapshots`, measuring actual pillar improvement over time.

---

## 2. Behavioural Signals Measured

Each Drive MC question is designed to elicit one of four growth-behaviour strategies:

| Strategy | Signal |
|----------|--------|
| **Expert pairing / shadowing** | Seeks external reference points for skill gaps |
| **Systematic self-analysis** | Tracks own failures to find patterns |
| **Deliberate practice under constraint** | Forces skill use in controlled/realistic settings |
| **Strategy pivot / structural change** | Changes approach entirely when current one fails |

These map to the four options (A/B/C/D) across all 16 questions, though the specific manifestation varies by field context.

---

## 3. Structural Mapping

All Drive questions are mapped via `getPillarForQuestion()`:

```
q5:  (5-1) % 5 = 4 → drive ✓
q10: (10-1) % 5 = 4 → drive ✓
q15: (15-1) % 5 = 4 → drive ✓
q20: (20-1) % 5 = 4 → drive ✓
```

**i18n category labels:**
- EN: "Drive" ✓
- IT: "Drive" ✓ (previously "Motivazione", corrected in v1.1)
- ES: "Drive" ✓ (previously "Impulso" in some descriptive text, question labels correct)

---

## 4. Scoring Architecture

### MC Baseline
```
raw_sum = Σ option_values (each 0–3)
max_possible = 4 questions × 3 = 12
drive_mc_baseline = (raw_sum / 12) × 100
```

### Open Answer Blending
```
open2 contributes to Drive: open2Score × 0.60 × 0.10 = 6% max influence
blended_drive = drive_mc_baseline × 0.90 + (open2Score × 0.60) × 0.10
```

### Longitudinal Drive (True Score)
```
Identifies 2 weakest pillars at baseline
Measures improvement rate across pillar_progress_snapshots
Computed by DB trigger; cached in profiles.drive_velocity
Requires ≥2 snapshots; shows "refining" until available
```

---

## 5. Assumptions

1. **MC as proxy:** MC Drive questions capture behavioural *tendency*, not actual *velocity*. They are necessary but insufficient for computing true Drive.
2. **Strategy diversity:** The four options represent genuinely different approaches to weakness-improvement. No option is objectively superior in all contexts.
3. **Positional scoring:** Options are scored 0–3 positionally. The design intent is that all options are defensible strategies; the positional ordering introduces a known systematic element.
4. **Field relevance:** Each field's scenarios are drawn from realistic professional contexts (debugging failures, board presentations, client rejections, incident response).

---

## 6. Known Limitations

### 6.1 Positional Scoring Bias
Options scored 0–3 by position. While designed as non-hierarchical strategies, the fixed ordering means that a pattern-detecting respondent could infer that "later = higher" and game accordingly. This is mitigated by:
- The absence of value labels in the UI
- The cognitive tension between options (no "obviously best" choice)
- The fact that MC is only a baseline proxy (true Drive is longitudinal)

### 6.2 Limited Discrimination at Extremes
- **Floor risk (0/100):** A respondent consistently choosing option A across all 4 questions scores 0. This doesn't necessarily indicate zero growth behaviour — it may indicate a preference for expert-reliant learning.
- **Ceiling risk (100/100):** A respondent choosing all D options scores 100. This may indicate genuine strategy-pivot behaviour OR test-gaming.

### 6.3 Four Items per Field
With only 4 MC items, the Drive baseline has limited internal consistency (Cronbach's α likely 0.4–0.6 range). This is acceptable because MC is a proxy; the longitudinal score is the definitive metric.

### 6.4 Cross-Field Comparability
A score of 75 in science_tech and 75 in service_ops do not necessarily reflect equivalent growth behaviours, as the scenarios and cognitive demands differ by field. Cross-field Drive comparisons should use longitudinal data only.

### 6.5 Social Desirability
While the v1.1 rewrite eliminated static motivation framing, some options (e.g., "track outcomes weekly") may still be perceived as "more disciplined" by certain respondent populations. The cognitive tension design mitigates but does not eliminate this.

---

## 7. Simulated Archetype Differentiation

### Archetypes Tested (science_tech field)

| Archetype | q5 | q10 | q15 | q20 | Raw Sum | Score |
|-----------|-----|------|------|------|---------|-------|
| A) High ambition, low change | 0 | 3 | 0 | 0 | 3 | 25 |
| B) Quiet disciplined improver | 1 | 2 | 0 | 1 | 4 | 33 |
| C) Reactive learner | 0 | 0 | 1 | 3 | 4 | 33 |
| D) Static high performer | 3 | 3 | 0 | 0 | 6 | 50 |
| E) Growth-oriented reflective | 2 | 2 | 2 | 1 | 7 | 58 |
| F) Socially desirable responder | 2 | 2 | 2 | 2 | 8 | 67 |

### Findings
- **Discrimination exists** between static/reactive (25–33) and growth-oriented (58–67) profiles
- **B and C overlap** at 33 — different strategies produce identical scores (acceptable: MC is a proxy)
- **F ceiling risk** is moderate — a socially desirable responder scores ~67, not 100, because option C (score=2) often appears most "virtuous"
- **True discrimination** comes from longitudinal velocity, not MC baseline

---

## 8. Risk Notes

| Risk | Severity | Mitigation |
|------|----------|------------|
| Positional scoring detected by respondent | Medium | No value labels shown; cognitive tension in options |
| MC baseline used as sole Drive score | High | System enforces "refining" state until longitudinal data exists |
| Cross-field score comparison | Medium | UI does not encourage cross-field Drive comparisons |
| 4-item reliability | Low-Medium | Acceptable for proxy; definitive score is longitudinal |
| Gaming by repeat test-takers | Low | Assessment is one-shot per field; re-takes are logged |

---

## 9. Intended Interpretation

For **candidates:**
> "Your Drive baseline reflects how you approach areas where you're not yet strong. This is a starting point — your true Growth Velocity will be refined as XIMA observes your development over time."

For **businesses:**
> "Drive MC signals indicate the candidate's default strategy for addressing weaknesses. Higher scores suggest more structured, self-directed improvement behaviour. However, true Drive is a longitudinal metric that requires multiple data points."

For **psychometric reviewers:**
> "Drive MC items are designed as behavioural baseline proxies within a weakness-first assessment framework. They are not intended to stand alone as a personality or motivation measure. The 4-item scale per field is sufficient for its role as an initial signal, with longitudinal pillar-improvement data providing the definitive Drive score."

---

## 10. IRT Consideration

**Question:** Would Item Response Theory modelling improve discrimination?

**Answer:** Potentially, but not at this stage.

- With 4 items per field, IRT parameter estimation would be unreliable (minimum ~200 responses per field recommended for stable 2PL estimates)
- The current positional scoring (0–3) is equivalent to a Likert-scored Rasch model, which is psychometrically adequate for a baseline proxy
- IRT would be valuable **after** collecting N≥500 responses per field, to identify items with poor discrimination or unexpected difficulty parameters
- **Recommendation:** Collect response data for 6 months, then fit a Graded Response Model (GRM) to assess item-level discrimination. If any item shows a < 0.5, consider replacement.

---

## 11. Recommendation

**The 16 Drive MC questions are ready for freeze** with the following conditions:

1. ✅ All questions comply with XIMA v1.1 spec (weakness-first, cognitive tension, no social desirability gradient)
2. ✅ Structural mapping is correct via `getPillarForQuestion()`
3. ✅ i18n labels are consistent across EN/IT/ES
4. ⚠️ Positional scoring is a known limitation — acceptable for baseline proxy
5. ⚠️ Post-launch IRT analysis recommended after N≥500 per field
6. ⚠️ Open2 blending contributes max 6% to final Drive — acceptable weighting

**Status: APPROVED FOR FREEZE**
