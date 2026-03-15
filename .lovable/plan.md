

## Plan: Dashboard Copy Update + Pillar Name Fix

### Scope

Add `dashboard` namespace keys to all 3 locale files. Update 7 component files to consume the new keys and fix raw DB field names appearing as labels.

### 1. Locale Files (3 files)

**EN (`en.json`)** — Add all user-provided `dashboard.*` keys into the existing `dashboard` namespace (lines 4464–4478). Merge with existing `dashboard.membership.*` keys, keeping those intact. The new keys cover: `page_label`, `welcome_headline`, `welcome_subheadline`, `growth_path_*`, `ximatar_*`, `advantage_*`, `friction_*`, `pillars_title`, `assessment_overview_title`, `drive_section_*`, `pillar_scores_*`, `story_*`, `mentor_*`, `cv_*`, `challenges_*`, `opportunities_*`, `pillar_computational_power` through `pillar_drive`.

Also add `pillars.computational_power` as an alias entry in the `pillars` namespace pointing to the same values as `pillars.computational` — this fixes the DB key mismatch where `computational_power` comes from the database but the translation key is `computational`.

**IT (`it.json`)** and **ES (`es.json`)** — same structure, localized values per user spec.

### 2. Component Updates (text + i18n only, no logic changes)

**`src/pages/Profile.tsx`** (3 key swaps):
- Line 141: `t('profile.dashboard_label')` → `t('dashboard.page_label')`
- Line 144: `t('profile.welcome_name', ...)` → `t('dashboard.welcome_headline', ...)`
- Line 146: `t('profile.page_subtitle')` → `t('dashboard.welcome_subheadline')`

**`src/components/profile/AssessmentOverviewCard.tsx`** (6 key swaps + pillar key fix):
- Line 42: `t('profile.assessment_overview')` → `t('dashboard.assessment_overview_title')`
- Line 57: `t('profile.drive_growth_velocity')` → `t('dashboard.drive_section_title')`
- Line 59: `t('profile.drive_subtitle')` → `t('dashboard.drive_section_body')`
- Line 68: `t('profile.drive_refining')` → `t('dashboard.drive_refining')`
- Line 73: `t('profile.pillar_scores')` → `t('dashboard.pillar_scores_title')`
- Line 76: Fix pillar key mapping — add `computational_power → computational` mapping so `t('pillars.computational_power.name')` resolves correctly
- Line 87: `t('profile.pillars_dynamic')` → `t('dashboard.pillar_scores_note')`
- Line 91: `t('profile.your_story')` → `t('dashboard.story_title')`

**`src/components/profile/StrengthFrictionSummary.tsx`** (3 key swaps):
- Line 21: `t('profile.strength_friction')` → `t('dashboard.advantage_friction_title')`
- Line 33: `t('profile.your_edge')` → `t('dashboard.advantage_title')`
- Line 54: `t('profile.friction_point')` → `t('dashboard.friction_title')`
- Line 72: `t('profile.growth_path')` → `t('dashboard.growth_path_label')`

**`src/components/profile/XimatarHeroCard.tsx`** (3 key swaps):
- Line 103: `t('profile.your_ximatar')` → `t('dashboard.ximatar_label')`
- Line 127: `t('profile.your_edge')` → `t('dashboard.ximatar_advantage_label')`
- Line 134: `t('profile.growth_area')` → `t('dashboard.ximatar_friction_label')`

**`src/components/profile/CVAnalysisCard.tsx`** (hardcoded strings → i18n):
- Line 177: `"Score Alignment"` → `t('dashboard.cv_score_alignment')`
- Line 199: `"Analyzing..."` → localized
- Line 204: `'Re-upload CV' / 'Upload CV'` → `t('dashboard.cv_reupload')`
- Line 293: `t('profile.cv_vs_assessment')` → `t('dashboard.cv_comparison_title')`
- Line 299: `t('profile.biggest_improvement')` → `t('dashboard.cv_best_improvement')`
- Line 324: `"CV Score"` → `t('dashboard.cv_score_label')`
- Line 346-350: `"CV Score"` / `"Assessment Score"` → `t('dashboard.cv_score_label')` / `t('dashboard.cv_assessment_label')`

**`src/components/profile/ChallengesForYouSection.tsx`** (2 key swaps):
- Line 219: `t('profile.challenges_for_you')` → `t('dashboard.challenges_title')`
- Line 230: `t('candidate.challenges.empty_title')` → `t('dashboard.challenges_empty_headline')`
- Line 231: `t('candidate.challenges.empty_desc')` → `t('dashboard.challenges_empty_body')`

**`src/components/opportunities/MyOpportunitiesSection.tsx`** (tab labels + empty state):
- Line 188: `t('opportunities.my_opportunities')` → `t('dashboard.opportunities_title')`
- Line 199: `t('opportunities.refresh')` → `t('dashboard.opportunities_refresh')`
- Line 208: `t('opportunities.for_you')` → `t('dashboard.opportunities_tab_for_you')`
- Line 212: `t('opportunities.saved')` → `t('dashboard.opportunities_tab_saved')`
- Line 216: `t('opportunities.applied')` → `t('dashboard.opportunities_tab_applied')`
- Line 243: `t('opportunities.no_jobs_available')` → split into `t('dashboard.opportunities_empty_headline')` + `t('dashboard.opportunities_empty_body')`

### 3. Pillar Name Fix (critical)

The DB returns `computational_power` as a field name but the `pillars` translation namespace uses `computational` as the key. Two fixes:

**Option A (chosen)**: Add `pillars.computational_power` alias entries in all 3 locale files that mirror `pillars.computational` values. This way `t('pillars.computational_power.name')` resolves without code changes.

**Option B**: Add a mapping function in each component. Already done in some places (ResultsComparison.tsx) but inconsistent.

Option A is cleaner — a single locale-level fix that works everywhere.

### File count: 10 files (3 JSON + 7 TSX)

