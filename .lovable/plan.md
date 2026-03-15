

## Plan: XIMAtar Journey Copy Update

### Scope
~7 files: 3 locale JSONs + 4 TSX components. Add `ximatarJourney` namespace to locales, update `t()` calls across the journey page and its child components.

### 1. Locale Files (3 files)

Add `ximatarJourney` top-level key with all user-provided content (EN/IT/ES). Keep existing `ximatar_intro`, `results`, `journey`, `open_scoring`, `professionals`, `mentors` namespaces intact.

### 2. Component Updates

**`src/pages/XimatarJourney.tsx`** (~6 key swaps):
- Line 58-60: `t('journey.step_1/2/3')` → `t('ximatarJourney.step1_label/step2_label/step3_label')`
- Line 121: `t('journey.title')` → `t('ximatarJourney.page_title')`
- Line 123: `t('journey.subtitle')` → `t('ximatarJourney.page_subtitle')`
- Line 207: `t('journey.choose_mentor_required')` → `t('ximatarJourney.closing_cta')`

**`src/components/ximatar-journey/ResultsComparison.tsx`** (~25 key swaps):
- Line 405: `t('results.title')` → `t('ximatarJourney.results_title')`
- Line 408: `t('ximatar_intro.storytelling')` → `t('ximatarJourney.results_tagline')`
- Line 409: `t('ximatar_intro.explanation')` → `t('ximatarJourney.results_archetype_body')`
- Line 424: `t('ximatar_intro.assignment_logic')` → `t('ximatarJourney.assignment_logic')`
- Line 429: `t('results.strongest_pillar')` → `t('ximatarJourney.your_edge_label')`
- Line 439: `t('results.weakest_pillar')` → `t('ximatarJourney.your_friction_label')`
- Line 449: `t('results.drive_level')` → `t('ximatarJourney.your_trajectory_label')`
- Line 462: `t('ximatar_intro.drive_paths.${driveLevel}')` → `t('ximatarJourney.drive_${driveLevel}_label')`
- Line 471: `t('pillars.drive.name')` → `t('ximatarJourney.drive_section_title')`
- Line 472: `t('pillars.drive.description')` → `t('ximatarJourney.drive_section_body')`
- Lines 494/534/574: `t('ximatar_intro.drive_paths.high/medium/low')` → `t('ximatarJourney.drive_high/medium/low_label')`
- Lines 501/541/581: `t('common.you', 'You')` → `t('ximatarJourney.drive_you_badge')`
- Lines 510/550/590: `t('ximatar_intro.drive_paths.high_desc/medium_desc/low_desc')` → `t('ximatarJourney.drive_high/medium/low_body')`
- Line 601: `t('results.assessment_scores')` → `t('ximatarJourney.scores_title')`
- Line 605: `t('results.total_score')` → `t('ximatarJourney.scores_total_label')`
- Line 648: `t('professionals.title')` → `t('ximatarJourney.mentor_section_title')`
- Line 649: `t('professionals.subtitle')` → `t('ximatarJourney.mentor_section_subtitle')`
- Line 650: `t('mentors.choose_to_continue')` → `t('ximatarJourney.mentor_choose_to_continue')`
- Line 677: `t('open_scoring.title')` → `t('ximatarJourney.open_scores_title')`
- Line 702: `t('ximatar_intro.compass')` → `t('ximatarJourney.closing_pullquote')`

**`src/components/results/XimatarProfileCard.tsx`** (~6 key swaps):
- Line 26: `t('results.your_ximatar')` → `t('ximatarJourney.your_ximatar_label')`
- Line 59: `t('results.core_traits')` → `t('ximatarJourney.core_traits_label')`
- Line 68: `t('results.strengths')` → `t('ximatarJourney.strengths_label')`
- Line 78: `t('results.areas_for_growth')` → `t('ximatarJourney.growth_areas_label')`
- Line 88: `t('results.ideal_roles')` → `t('ximatarJourney.ideal_roles_label')`

**`src/components/FeaturedProfessionals.tsx`** (~8 key swaps):
- Line 272: `t('professionals.showing_compatible')` → `t('ximatarJourney.mentor_showing_compatible')`
- Line 282: `t('professionals.refresh_mentors')` → `t('ximatarJourney.mentor_refresh_cta')`
- Line 288: `t('professionals.refresh_hint')` → `t('ximatarJourney.mentor_refresh_note')`
- Line 344: `t('professionals.compatibility')` → `t('ximatarJourney.mentor_match_label')`
- Line 373: `t('professionals.specialties')` → `t('ximatarJourney.mentor_specialties_label')`
- Line 394: `t('professionals.xima_pillars')` → `t('ximatarJourney.mentor_pillars_label')`
- Line 416: `t('professionals.select')` / `t('professionals.selected')` → `t('ximatarJourney.mentor_select_cta')`

**`src/components/ximatar-journey/OpenAnswerScore.tsx`** (~8 key swaps):
- Line 68: `t('assessment.open_question')` → `t('ximatarJourney.open_question_label')`
- Line 94: `t('open_scoring.why')` → `t('ximatarJourney.open_score_why')`
- Line 134: `t('open_scoring.consider_elaborating')` → `t('ximatarJourney.open_score_improve_tip')`
- Line 181: `t('open_scoring.rubric_breakdown')` → `t('ximatarJourney.open_score_breakdown_label')`
- Lines 185-209: rubric labels `t('open_scoring.rubric.length/relevance/structure/specificity/action')` → `t('ximatarJourney.open_score_clarity/open_score_relevance/open_score_depth/open_score_coherence/open_score_insight')` (note: mapping `length`→`clarity`, `structure`→`coherence`, `specificity`→`insight`, `action`→`depth` based on user spec — but the actual rubric dimensions are length/relevance/structure/specificity/action. The user spec names Clarity/Depth/Relevance/Coherence/Insight as display labels, so these are just display label swaps, not logic changes)
- Line 218: `t('open_scoring.note')` → `t('ximatarJourney.open_score_influence_note')`

### File count: 7 (3 JSON + 4 TSX)

### Implementation Note
Keep all existing `ximatar_intro`, `results`, `journey`, `open_scoring`, `professionals`, `mentors` namespaces — they may be referenced by other pages (Profile, About, HowItWorks). The `ximatarJourney` namespace is additive. The `FeaturedProfessionals` component is shared but the mentor labels in the user spec match its context on the journey page. Other pages using `FeaturedProfessionals` may need their own key references later, but for now update it to use `ximatarJourney.*` as it's primarily rendered on this page.

