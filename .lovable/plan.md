

## Plan: Development Plan → Growth Hub Rename + Copy Update

### Scope
4 files: 3 locale JSONs + `DevelopmentPlan.tsx`. Add `developmentPlan` namespace to locales, update all `t('development.*')` calls in the component to `t('developmentPlan.*')` with new key names. Keep existing `development` namespace intact (may be referenced elsewhere like ximai-chat edge function).

### 1. Locale Files (3 files)

Add `developmentPlan` top-level key with all user-provided content in each locale file. Insert after the existing `development` block (keep `development` untouched).

- EN: lines after 1459 — insert full `developmentPlan` namespace
- IT: lines after 1523 — insert full `developmentPlan` namespace  
- ES: lines after 1407 — insert full `developmentPlan` namespace

### 2. `src/pages/DevelopmentPlan.tsx` — Key swaps (18 changes)

All `t('development.*')` → `t('developmentPlan.*')` with new key names:

| Line | Old key | New key |
|------|---------|---------|
| 158-159 | (no eyebrow) | Add eyebrow: `developmentPlan.page_label` as `font-mono text-xs uppercase tracking-widest text-primary` above title |
| 159 | `development.title` | `developmentPlan.page_title` |
| 162 | `development.subtitle` | `developmentPlan.page_subtitle` |
| 171 | `development.back_to_dashboard` | `developmentPlan.back_button` |
| 182 | `development.overall_progress` | `developmentPlan.progress_title` |
| 189 | `development.tests_completed` | `developmentPlan.progress_tests_completed_label` |
| 208 | `development.tests_completed` | `developmentPlan.stat_completed_label` |
| 218 | `development.tests_remaining` | `developmentPlan.stat_remaining_label` |
| 228 | `development.progress` | `developmentPlan.stat_progress_label` |
| 270 | `development.areas.${area.key}.title` | `developmentPlan.category_${area.key}_title` — requires mapping: `analytical`→`computational`, `communication`→`communication`, `creative`→`creativity` |
| 273 | `development.areas.${area.key}.description` | `developmentPlan.category_${area.key}_body` — same mapping |
| 279 | `development.priority.${area.priority}` | `developmentPlan.${priority}_badge` — mapping: `high`→`priority_badge`, `medium`→`recommended_badge`, `low`→`optional_badge` |
| 283 | `development.minutes` | `developmentPlan.minutes_label` |
| 340 | `development.questions` | `developmentPlan.questions_label` |
| 344 | `development.minutes` | `developmentPlan.minutes_label` |
| 368 | `development.completed` | `developmentPlan.completed_badge` |
| 373 | `development.start_test` | `developmentPlan.start_test_button` |
| 396 | `development.next_steps` | `developmentPlan.next_steps_title` |
| 408 | `development.recommendations.focus_priority.title` | `developmentPlan.next_step_1_title` |
| 411 | `development.recommendations.focus_priority.description` | `developmentPlan.next_step_1_body` |
| 424 | `development.recommendations.schedule_practice.title` | `developmentPlan.next_step_2_title` |
| 427 | `development.recommendations.schedule_practice.description` | `developmentPlan.next_step_2_body` |
| 440 | `development.recommendations.connect_mentor.title` | `developmentPlan.next_step_3_title` |
| 443 | `development.recommendations.connect_mentor.description` | `developmentPlan.next_step_3_body` |

**Category key mapping** — The `developmentAreas` array uses keys `analytical`, `communication`, `creative` but the new i18n keys use `computational`, `communication`, `creativity`. Two options:
- **Option A**: Change the `key` field in the data array to match (`analytical`→`computational`, `creative`→`creativity`)
- **Option B**: Add a lookup map

Option A is cleaner since these keys are only used for i18n lookup. The `key` field has no other binding.

**Priority badge mapping** — Currently uses `t('development.priority.high')` etc. The new keys are flat: `priority_badge`, `recommended_badge`, `optional_badge`. Add a small map: `{ high: 'priority_badge', medium: 'recommended_badge', low: 'optional_badge' }`.

**Eyebrow addition** — Insert `<p className="font-mono text-xs uppercase tracking-widest text-primary">` with `t('developmentPlan.page_label')` above the h1 in the header `space-y-2` div.

### File count: 4 (3 JSON + 1 TSX)

