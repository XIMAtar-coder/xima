
# Phase 3C: Hiring Goal Wizard Upgrade — Execution Confirmation

Plan was already approved. Execution will proceed in this order:

## 1. Database Migration
Add 7 columns to `hiring_goal_drafts`: `required_skills` (jsonb), `nice_to_have_skills` (jsonb), `years_experience_min` (int), `years_experience_max` (int), `education_level` (text + CHECK), `languages` (jsonb), `original_seniority` (text).

## 2. SuggestFieldButton Component
New `src/components/business/SuggestFieldButton.tsx` — replace mode (dialog) for role_summary, additive mode (popover chips) for responsibilities/required_skills/nice_to_have.

## 3. HiringGoalCreate.tsx Expansion
- `?from_listing=<id>` pre-fill from job_posts.import_raw_data
- ImportBanner across all 5 steps
- required_skills + nice_to_have_skills chip editors in Step 1
- "Dettagli avanzati" collapsible in Step 2 (years exp, education, languages)
- original_seniority info note in Step 2
- RAL labels on Step 4, monthly de-emphasized
- XIMA HR checkbox on Step 4 review
- Branching submit: unchecked → draft + candidates; checked → active + request-xima-hr + dashboard (no shortlist)

## 4. JobImportWizard i18n
Wrap all English Step 2 labels in `t()`.

## 5. i18n Keys
Add all new keys to it.json, en.json, es.json.

## Verification
Both scenarios (XIMA HR unchecked + checked) with SQL confirmation queries.
