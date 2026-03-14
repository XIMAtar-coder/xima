

## Plan: Update About Page Copy + Fix Pillars + Add Origin/Stats/Pullquote Sections

### Current State
- `About.tsx` uses `about.*` keys — all three locale files have an `about` namespace
- Pillars array is hardcoded with wrong keys: `experience`, `intelligence`, `motivation`, `attitude`, `analysis`
- No origin section, no stats section, no hero pullquote
- CTA has false social proof ("Join thousands...")
- Spanish `about` namespace is minimal (12 keys vs 44 in EN/IT)

### Changes: 4 files

**1. Three locale files** — Replace entire `about` namespace with provided copy

- EN (lines 943-988): Replace with full new `about` object (eyebrow, hero_*, origin_*, problem_*, pillars_*, ximatar_*, benefits_*, stats_*, cta_*)
- IT (lines 1078-1123): Same replacement
- ES (lines 1071-1083): Same replacement (this one expands significantly)

Key mapping from old → new keys:
- `title` → `hero_headline`, `subtitle` → `hero_subheadline`
- `match_problem_title` → `problem_headline`, `match_problem_subtitle` → `problem_subheadline`
- `match_problem_description` → `problem_body`, `match_leads_to` → `problem_list_intro`
- `mismatch_1-5` → `problem_item_1-5`, `solution_description` → `problem_solution`
- `approach_title` → `approach_headline`, `five_pillars_title` → `pillars_title`
- `five_pillars_description` → `pillars_body`
- Old pillar keys removed, new `pillar_1` through `pillar_5` added
- `ximatar_description` → `ximatar_body`
- `benefits_title` → `benefits_headline`, `job_seekers_title` → `candidates_title`
- `job_seekers_1-5` → `candidate_1-5`, `employers_1-5` → `employer_1-5`
- `ready_title` → `cta_headline`, `ready_subtitle` → `cta_body`, `get_started` → `cta_button`
- New keys: `hero_pullquote`, `origin_*`, `stats_*`, `eyebrow`, all `_label` keys

**2. `src/pages/About.tsx`** — Update all `t()` calls + 4 structural additions

**Fix pillars array** (lines 12-18): Replace 5 wrong pillar objects with:
```
const pillars = [
  { key: '1', color: 'from-rose-500 to-rose-600' },
  { key: '2', color: 'from-purple-500 to-purple-600' },
  { key: '3', color: 'from-blue-500 to-blue-600' },
  { key: '4', color: 'from-emerald-500 to-emerald-600' },
  { key: '5', color: 'from-amber-500 to-amber-600' },
];
```
And update the render (line 127) from `t(`about.${pillar.key}_pillar`)` → `t(`about.pillar_${pillar.key}`)`

**Hero updates** (lines 48-61):
- Add eyebrow: `t('about.eyebrow')` as small caps label above headline
- `t('about.title')` → `t('about.hero_headline')` with `whitespace-pre-line`
- `t('about.subtitle')` → `t('about.hero_subheadline')`
- Add pullquote below: `t('about.hero_pullquote')` — italic, `text-lg`, centered, `text-muted-foreground`

**Add Origin section** — Insert between hero and problem section (after line 61, before line 63):
- Glass card with left accent border (`border-l-4 border-l-primary`)
- `t('about.origin_label')` as mono label, `t('about.origin_headline')` as heading, `t('about.origin_body')` as body text

**Problem section** (lines 64-99): Update all keys:
- `match_problem_title` → `problem_headline` (with `whitespace-pre-line`)
- `match_problem_subtitle` → `problem_subheadline`
- `match_problem_description` → `problem_body`
- `match_leads_to` → `problem_list_intro`
- `mismatch_1-5` → `problem_item_1-5`
- `solution_description` → `problem_solution`

**Approach section** (lines 101-173): Update keys:
- `approach_title` → `approach_headline`, add `approach_label`
- `five_pillars_title` → `pillars_title`, `five_pillars_description` → `pillars_body`
- `ximatar_title` stays, `ximatar_description` → `ximatar_body`
- `why_animals_description` → `why_animals_body`
- `features_title` → `morphology_title`, `features_description` → `morphology_body`
- `mentor_matching_title` → `mentor_title`, `mentor_matching_description` → `mentor_body`

**Benefits section** (lines 176-220): Update keys:
- `benefits_title` → `benefits_headline`, add `benefits_label`
- `job_seekers_title` → `candidates_title`, `job_seekers_1-5` → `candidate_1-5`
- `employers_title` stays, `employers_1-5` → `employer_1-5`

**Add Stats section** — Insert between benefits and CTA (after line 220, before line 222):
- `stats_label` as mono label, `stats_headline` as heading
- 2x2 grid (`grid grid-cols-2 md:grid-cols-4 gap-6`), each stat: `stat_X_value` in `text-primary text-4xl font-bold`, `stat_X_label` below in `text-muted-foreground text-sm`

**CTA section** (lines 222-245): Update keys:
- `ready_title` → `cta_headline`
- `ready_subtitle` → `cta_body` (removes false social proof)
- `get_started` → `cta_button`

### File count: 4 files (3 JSON + About.tsx)

