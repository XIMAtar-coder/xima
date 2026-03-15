

## Plan: Business Portal Copy Update

### Scope
~17 files: 3 locale JSONs + ~14 TSX components/pages. Add `businessPortal` namespace to locales, update `t()` calls in business components. Text and i18n keys only — no logic, routing, or structure changes.

### 1. Locale Files (3 files)

Add `businessPortal` top-level key with all user-provided content (EN/IT/ES) to each locale file. Keep all existing `business.*`, `business_portal.*`, `jobs.*`, `challenges.*` namespaces intact (they may be referenced by non-Settings components, toast messages, hooks, etc.).

### 2. Component Updates — Navigation

**`BusinessLayout.tsx`** (~9 key swaps):
- Lines 75-81: Nav item `labelKey` values: `business.nav.overview` → `businessPortal.nav_overview`, etc. for all 7 nav items
- Line 159: `t('business.nav.sign_out')` → `t('businessPortal.nav_logout')`
- Line 193: `t('business_guide.open_button', 'Guide')` → `t('businessPortal.nav_guide')`

### 3. Dashboard Components

**`BusinessCommandCenter.tsx`** (~10 key swaps):
- Line 139: `t('business.command_center.subtitle')` → `t('businessPortal.dashboard_subtitle')`
- Line 135: `t('business.command_center.profile_ready/incomplete')` → `t('businessPortal.dashboard_profile_ready')` (conditionally)
- Line 143: `t('business.command_center.last_generated')` → `t('businessPortal.dashboard_last_updated')`
- Line 163: `t('business.command_center.next_actions')` → `t('businessPortal.quick_actions_title')`
- Lines 175: action button labels → `t('businessPortal.quick_action_create_challenge')`, etc.
- Line 206: KPI labels → `t('businessPortal.pipeline_stat_challenges')`, `pipeline_stat_evaluations`, `pipeline_stat_pipeline`, `pipeline_stat_shortlist`
- Line 222: `t('business.command_center.attention_needed')` → `t('businessPortal.attention_title')`

**`BusinessOverviewBanner.tsx`** (~10 key swaps):
- Line 203: `t('business.overview.how_xima_works')` → `t('businessPortal.how_xima_works_title')`
- Line 206: `t('business.overview.pipeline_subtitle')` → `t('businessPortal.how_xima_works_body')`
- Line 244: `t('business.overview.control_note')` → `t('businessPortal.how_xima_works_privacy')`
- Line 254: `t('business.overview.company_snapshot')` → `t('businessPortal.company_overview_title')`
- Line 257: `t('business.overview.snapshot_subtitle')` → `t('businessPortal.company_overview_body')`
- Line 267-288: field labels → `t('businessPortal.company_field_location')`, `company_field_sector`, `company_field_employees`, `company_field_website`
- Line 297/315: employee hint → `t('businessPortal.company_overview_employees_hint')`

**`BusinessJobPostsOverviewBanner.tsx`** (~8 key swaps):
- Line 133: title → `t('businessPortal.jobs_overview_title')`
- Line 143: create CTA → `t('businessPortal.jobs_create_cta')`
- Line 150: view all CTA → `t('businessPortal.jobs_view_all_cta')`
- Line 183: KPI labels → `t('businessPortal.jobs_stat_open')`, `jobs_stat_active`, `jobs_stat_applications`, `jobs_stat_to_evaluate`
- Line 194: recent title → `t('businessPortal.jobs_recent_title')`
- Line 210: empty state → `t('businessPortal.jobs_empty_headline')` + `jobs_empty_body`

**`ActiveChallengesOverview.tsx`** (~5 key swaps):
- Line 64: title → `t('businessPortal.active_challenges_title')`
- Line 67: badge → `t('businessPortal.challenge_status_active')`
- Line 100: invited label → `t('businessPortal.challenge_invited_label')`
- Line 104: responses label → `t('businessPortal.challenge_responses_label')`
- Line 133: view responses → `t('businessPortal.challenge_view_responses')`

**`CandidateEngagement.tsx`** (~10 hardcoded strings → i18n):
- Line 104: `"Profile Views"` → `t('businessPortal.engagement_profile_views_title')`
- Line 110: `"Candidates who viewed your opportunities"` → `t('businessPortal.engagement_profile_views_body')`
- Line 117: `"Applications"` → `t('businessPortal.engagement_applications_title')`
- Line 121: `"Total applications received"` → `t('businessPortal.engagement_applications_body')`
- Line 130: `"Active Challenges"` → `t('businessPortal.engagement_active_challenges_title')`
- Line 136: `"Candidates working on challenges"` → `t('businessPortal.engagement_active_challenges_body')`
- Line 145: `"Recent Candidate Activity"` → `t('businessPortal.recent_activity_title')`
- Line 147: `"Candidates who recently engaged..."` → `t('businessPortal.recent_activity_subtitle')`
- Line 153: `"No recent candidate activity"` → `t('businessPortal.recent_activity_empty')`
- Add `useTranslation` import

**`CompanyProfileCard.tsx`** (~12 key swaps):
- Line 89: `t('business.profile.title')` → `t('businessPortal.company_profile_title')`
- Line 92: `t('business.profile.last_updated')` → `t('businessPortal.company_profile_updated')`
- Line 99: `t('business.profile.summary')` → `t('businessPortal.company_summary_label')`
- Line 111: `t('business.profile.values')` → `t('businessPortal.company_values_label')`
- Line 130: `t('business.profile.operating_style')` → `t('businessPortal.company_operating_style_label')`
- Line 139: `t('business.profile.communication_style')` → `t('businessPortal.company_communication_style_label')`
- Line 153: `t('business.profile.ideal_traits')` → `t('businessPortal.company_ideal_candidate_label')`
- Line 167: `t('business.profile.risk_areas')` → `t('businessPortal.company_risk_areas_label')`
- Line 182: `t('business.profile.pillar_vector')` → `t('businessPortal.company_pillar_profile_label')`
- Line 222: `t('business.profile.recommended_ximatars')` → `t('businessPortal.company_recommended_ximatar_label')`
- Line 241: `t('business.profile.recommended_ximatars_description')` → `t('businessPortal.company_recommended_ximatar_body')`
- Line 249: `t('business.profile.regenerate_cta')` → `t('businessPortal.company_regenerate_profile')`

**`Dashboard.tsx`** (~8 key swaps):
- Line 414/422/430/438: stat card titles → `t('businessPortal.pipeline_stat_*')` or keep existing (these are different from KPIs)
- Line 539: `t('business.hiring_goal.completed_title')` → `t('businessPortal.hiring_goal_saved_title')`
- Line 542: `t('business.hiring_goal.completed_desc')` → `t('businessPortal.hiring_goal_saved_body')`
- Line 550: `t('business.hiring_goal.generate_shortlist')` → `t('businessPortal.hiring_goal_generate_shortlist')`
- Line 565: `t('business.hiring_goal.edit_goal')` → `t('businessPortal.hiring_goal_edit')`
- Line 596/597: `t('business.goals.portfolio_title/desc')` → `t('businessPortal.hiring_goals_title/subtitle')`
- Line 608: `t('business.goals.new_goal')` → `t('businessPortal.hiring_goals_new_cta')`
- Line 667: `t('business.dashboard.candidate_engagement')` → `t('businessPortal.candidate_engagement_title')`

### 4. Page-Level Components

**`Candidates.tsx`** (~6 key swaps):
- Line 857: `t('business.candidates.title')` → `t('businessPortal.candidates_page_title')`
- Line 859: `t('business.candidates.available')` → `t('businessPortal.candidates_count_label')`
- Line 913: `t('business.candidates.search_placeholder')` → `t('businessPortal.candidates_search_placeholder')`
- Line 925: `t('business.candidates.all_types')` → `t('businessPortal.candidates_filter_all_types')`
- Line 1049: `t('business.candidates.no_candidates')` → `t('businessPortal.candidates_empty_headline')`

**`Challenges.tsx`** (~6 key swaps):
- Line 219/221/223: status badges → `t('businessPortal.challenge_status_active/draft/archived')`
- Line 250: `t('challenges.page_title')` → `t('businessPortal.challenges_page_title')`
- Line 253: `t('challenges.page_subtitle')` → `t('businessPortal.challenges_page_subtitle')`
- Line 262: `t('challenges.new_challenge')` → `t('businessPortal.challenges_new_cta')`
- Line 272/275: empty state → `t('businessPortal.evaluations_empty_headline')` pattern

**`Jobs.tsx`** (~10 key swaps):
- Line 185/188/189: status badges → `t('businessPortal.jobs_filter_published/archived/draft')`
- Line 214: `t('jobs.title')` → `t('businessPortal.jobs_page_title')`
- Line 216: `t('jobs.subtitle')` → `t('businessPortal.jobs_page_subtitle')`
- Line 222: `t('business.pdf_import.import_from_pdf')` → `t('businessPortal.jobs_import_pdf')`
- Line 226: `t('jobs.create_job')` → `t('businessPortal.jobs_page_create_cta')`
- Lines 235-249: filter tabs → `t('businessPortal.jobs_filter_all/draft/published/archived')`
- Lines 264-268: empty state → `t('businessPortal.jobs_page_empty_headline')` + `jobs_page_empty_body`

**`Evaluations.tsx`** (~6 key swaps):
- Line 138: `t('business_portal.tests_evaluations')` → `t('businessPortal.evaluations_page_title')`
- Line 140: `t('business_portal.review_submissions')` → `t('businessPortal.evaluations_page_subtitle')`
- Line 149: `t('business_portal.no_evaluations')` → `t('businessPortal.evaluations_empty_headline')`
- Line 151: `t('business_portal.create_challenges_invite')` → `t('businessPortal.evaluations_empty_body')`
- Fix hardcoded CSS colors (`text-white`, `text-[#A3ABB5]`) → use `text-foreground` / `text-muted-foreground` for theme consistency

**`Reports.tsx`** (~12 key swaps):
- Line 144: `t('business.reports.title')` → `t('businessPortal.reports_page_title')`
- Line 145: `t('business.reports.subtitle')` → `t('businessPortal.reports_page_subtitle')`
- Line 153: `t('business.reports.export_report')` → `t('businessPortal.reports_export_cta')`
- Line 167/179/191/203: stat labels → `t('businessPortal.reports_stat_contacted/shortlisted/hired/conversion')`
- Line 213/215: shortlist chart → `t('businessPortal.reports_shortlist_activity_title/subtitle')`
- Line 240/242: challenge chart → `t('businessPortal.reports_challenge_participation_title/subtitle')`
- Line 267/269: match distribution → `t('businessPortal.reports_score_distribution_title/subtitle')`

**`Settings.tsx`** (~15 key swaps):
- Line 251: `t('business_portal.settings')` → `t('businessPortal.settings_page_title')`
- Line 252: `t('business_portal.manage_preferences')` → `t('businessPortal.settings_page_subtitle')`
- Line 264: `t('business_portal.company_info')` → `t('businessPortal.settings_company_title')`
- Line 267: `t('business_portal.update_details')` → `t('businessPortal.settings_company_subtitle')`
- Line 272/286/301: labels → `t('businessPortal.settings_company_name_label/website_label/hr_email_label')`
- Line 318/320: `t('business_portal.challenge_defaults/default_parameters')` → `t('businessPortal.settings_challenge_defaults_title/subtitle')`
- Line 327/343: duration/difficulty labels → `t('businessPortal.settings_challenge_duration_label/difficulty_label')`
- Line 365: save button → `t('businessPortal.settings_save_cta')`
- Line 376-379: snapshot title/desc → `t('businessPortal.settings_snapshot_title/subtitle')`
- Line 387/389: toggle → `t('businessPortal.settings_snapshot_manual_toggle/body')`
- Lines 406-496: field labels → `t('businessPortal.settings_snapshot_city_label')`, etc.
- Line 502: helper → `t('businessPortal.settings_snapshot_note')`
- Line 514/525: buttons → `t('businessPortal.settings_snapshot_save_cta/reset_cta')`

**`CompanyLegalSettings.tsx`** (~15 key swaps):
- Line 69: `t('business.legal.title')` → `t('businessPortal.settings_legal_title')`
- Line 72: `t('business.legal.description')` → `t('businessPortal.settings_legal_subtitle')`
- Line 81: `t('business.legal.legal_name')` → `t('businessPortal.settings_legal_company_name_label')`
- Line 91: hint → `t('businessPortal.settings_legal_company_name_hint')`
- Line 99: `t('business.legal.registered_address')` → `t('businessPortal.settings_legal_address_label')`
- Line 105/118/131/144: address fields → `t('businessPortal.settings_legal_address_street/city/zip/country')`
- Line 161: `t('business.legal.registration_info')` → `t('businessPortal.settings_legal_registration_title')`
- Line 167/180: VAT/REA → `t('businessPortal.settings_legal_vat_label/rea_label')`
- Line 197: `t('business.legal.contact_email')` → `t('businessPortal.settings_legal_contact_email_label')`
- Line 208: hint → `t('businessPortal.settings_legal_contact_email_hint')`
- Line 223: save → `t('businessPortal.settings_legal_save_cta')`

**`BusinessPlanCard.tsx`** (~10 key swaps):
- Line 19-28: `FEATURE_LABELS` hardcoded strings → use `t('businessPortal.settings_plan_feature_*')` keys (requires making labels dynamic)
- Line 57: `t('business.plan.title')` → `t('businessPortal.settings_plan_title')`
- Line 65: `t('business.plan.subtitle')` → `t('businessPortal.settings_plan_subtitle')`
- Line 74: `t('business.plan.seats')` → `t('businessPortal.settings_plan_seats_label')`
- Line 107: `t('business.plan.features')` → `t('businessPortal.settings_plan_features_label')`
- Line 144: `t('business.plan.upgrade')` → `t('businessPortal.settings_plan_upgrade_cta')`

### File count: ~17 (3 JSON + ~14 TSX)

### Implementation Note
Keep all existing `business.*`, `business_portal.*`, `jobs.*`, `challenges.*` keys in locale files untouched — other pages (goal subpages, modals, hooks, toasts) reference them. The `businessPortal` namespace is additive. Components only swap the specific `t()` calls listed above.

