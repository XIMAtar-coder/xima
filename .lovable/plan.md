

## Plan: Settings Page Copy Update

### Scope
7 files: 3 locale JSONs + 4 component files. Update existing `settings.*`, `referral.*`, `credits.*`, and `dataExport.*` keys with user-provided copy. Swap component `t()` calls to use the new flat `settings.*` keys where they currently use scattered namespaces.

### 1. Locale Files (3 files)

**Strategy**: The user's spec uses flat `settings.*` keys but the components currently read from `settings.*`, `referral.*`, `credits.*`, and `dataExport.*`. Two approaches:

- **Option A**: Merge everything into `settings.*` and update all component `t()` calls
- **Option B**: Update copy in-place under existing namespaces, add new keys under `settings.*`

**Chosen: Option A** — consolidate under `settings.*` as the user specified. This means updating `t()` calls in 4 components.

**EN (`en.json`)**:
- Lines 4365–4433: Replace entire `settings` block with user-provided content. Keep `deletion.*` and `profiling.*` sub-objects but update their values to match the new copy (e.g., `profiling.whatIsDescription` gets SHA-256 audit trail text). Add new flat keys: `mentor_cv_title/body/incomplete`, `membership_*`, `referral_*`, `upgrade_*`, `plan_freemium/basic/premium/pro_*`, `export_*`, `ai_profiling_*`, `delete_*`.
- Lines 4434–4446: Keep `referral.*` and `credits.*` namespaces intact (other components may reference them) but the Settings components will now read from `settings.*`.

**IT (`it.json`)** lines 4087–4141 and **ES (`es.json`)** lines 2834–2888: Same structure with localized values.

**Key mapping** — existing → new:
- `settings.title` → `settings.page_title`
- `settings.subtitle` → `settings.page_subtitle`
- `settings.cv_consent_title` → `settings.mentor_cv_title`
- `settings.cv_consent_desc` → `settings.mentor_cv_body`
- `settings.no_mentor_for_cv` → `settings.mentor_cv_incomplete`
- `settings.membership_title` stays
- `referral.title` → `settings.referral_title`
- `referral.how_it_works` → `settings.referral_body`
- `referral.earn_credits` → `settings.referral_credit_rule`
- `referral.qualified_rule` → `settings.referral_note`
- `settings.qualified_referrals` → `settings.referral_validated_label`
- `credits.available` → `settings.referral_available_label` (+ `settings.membership_credits_label`)
- `credits.cost_standard_session` → `settings.membership_credits_note`
- `settings.upgrade_title` stays, add `settings.upgrade_subtitle`
- `dataExport.title` → `settings.export_title`
- `dataExport.description` → `settings.export_body`
- `dataExport.includes` → `settings.export_includes_label`
- `dataExport.includesList.*` → `settings.export_item_1` through `export_item_6`
- `dataExport.downloadButton` → `settings.export_button`
- `settings.profiling.title` → `settings.ai_profiling_title`
- `settings.profiling.description` → `settings.ai_profiling_subtitle`
- `settings.profiling.whatIsTitle` → `settings.ai_profiling_what_title`
- `settings.profiling.whatIsDescription` → `settings.ai_profiling_what_body`
- `settings.profiling.includes1-3` → `settings.ai_profiling_item_1-3`
- `settings.profiling.optOutLabel` → `settings.ai_profiling_opt_out_label`
- `settings.profiling.optOutDescription` → `settings.ai_profiling_opt_out_body`
- `settings.profiling.humanReview` → `settings.ai_profiling_human_review`
- `settings.deletion.title` → `settings.delete_title`
- `settings.deletion.description` → `settings.delete_subtitle`
- `settings.deletion.warningTitle` → `settings.delete_warning_label`
- `settings.deletion.warning1-4` → `settings.delete_warning_1-4`
- `settings.deletion.button` → `settings.delete_button`

**Important**: Keep `settings.deletion.*` and `settings.profiling.*` nested keys for the dialog/toast messages that aren't in the user's spec (confirmTitle, confirmDescription, typeToConfirm, confirmButton, deleting, success, successMessage, partialSuccess, etc., and optOutSuccess, optInSuccess, etc.). Only update the copy for keys that have equivalents in the user spec.

### 2. Component Updates (4 files, text only)

**`src/pages/Settings.tsx`** (2 key swaps):
- Line 86: `t('settings.title')` → `t('settings.page_title')`
- Line 89: `t('settings.subtitle')` → `t('settings.page_subtitle')`

**`src/components/settings/MembershipSection.tsx`** (~15 key swaps):
- Line 32: `textKey: 'settings.benefit_free_intro'` → `'settings.membership_benefit_1'`
- Line 33: `textKey: 'settings.benefit_referral_credits'` → `'settings.membership_benefit_2'`
- Line 42-64: Update remaining benefit textKeys similarly (these stay as-is since they're plan-specific benefits not in the user spec — keep existing)
- Line 197: `t('settings.membership_title', ...)` stays
- Line 205: `t('settings.membership_subtitle', ...)` stays
- Line 231: `t('credits.available', ...)` → `t('settings.membership_credits_label')`
- Line 241: `t('credits.cost_standard_session', ...)` → `t('settings.membership_credits_note')`
- Line 252: `t('referral.title', ...)` → `t('settings.referral_title')`
- Line 255: `t('referral.how_it_works', ...)` → `t('settings.referral_body')`
- Line 261: `t('referral.earn_credits', ...)` → `t('settings.referral_credit_rule')`
- Line 263: `t('referral.qualified_rule', ...)` → `t('settings.referral_note')`
- Line 272: `t('settings.qualified_referrals', ...)` → `t('settings.referral_validated_label')`
- Line 278: `t('credits.available', ...)` → `t('settings.referral_available_label')`
- Line 289: `t('settings.your_invite_link', ...)` → `t('settings.referral_link_label')`
- Line 307: `t('settings.send_invite_email', ...)` → `t('settings.referral_email_label')`
- Line 312: `t('settings.email_placeholder', ...)` → `t('settings.referral_email_placeholder')`
- Line 367: `t('settings.upgrade_title', ...)` stays, add `CardDescription` with `t('settings.upgrade_subtitle')`
- Line 396: `t('pricing.contact_sales', ...)` → `t('settings.plan_basic_cta')` (or use plan-specific CTA based on tier key)
- Add plan taglines below plan labels using `t('settings.plan_${key}_tagline')`

**`src/components/profile/DataExportButton.tsx`** (~8 key swaps):
- Line 16: `t("dataExport.title")` → `t("settings.export_title")`
- Line 19: `t("dataExport.description")` → `t("settings.export_body")`
- Line 24: `t("dataExport.includes")` → `t("settings.export_includes_label")`
- Lines 27-32: `t("dataExport.includesList.profile")` → `t("settings.export_item_1")`, etc. through `export_item_6`
- Line 43: `t("dataExport.exporting")` stays (not in spec, keep existing)
- Line 48: `t("dataExport.downloadButton")` → `t("settings.export_button")`

**`src/components/settings/ProfilingOptOutSection.tsx`** (~10 key swaps):
- Line 92: `t('settings.profiling.title')` → `t('settings.ai_profiling_title')`
- Line 95: `t('settings.profiling.description')` → `t('settings.ai_profiling_subtitle')`
- Line 103: `t('settings.profiling.whatIsTitle')` → `t('settings.ai_profiling_what_title')`
- Line 105: `t('settings.profiling.whatIsDescription')` → `t('settings.ai_profiling_what_body')`
- Lines 108-110: `t('settings.profiling.includes1-3')` → `t('settings.ai_profiling_item_1-3')`
- Line 119: `t('settings.profiling.optOutLabel')` → `t('settings.ai_profiling_opt_out_label')`
- Line 122: `t('settings.profiling.optOutDescription')` → `t('settings.ai_profiling_opt_out_body')`
- Line 154: `t('settings.profiling.humanReview')` → `t('settings.ai_profiling_human_review')`
- Keep toast keys (`optOutSuccess`, `optInSuccess`, etc.) under `settings.profiling.*` — they're internal feedback, not in the user spec

**`src/components/settings/AccountDeletionSection.tsx`** (~7 key swaps):
- Line 95: `t('settings.deletion.title')` → `t('settings.delete_title')`
- Line 98: `t('settings.deletion.description')` → `t('settings.delete_subtitle')`
- Line 106: `t('settings.deletion.warningTitle')` → `t('settings.delete_warning_label')`
- Lines 108-111: `t('settings.deletion.warning1-4')` → `t('settings.delete_warning_1-4')`
- Line 121: `t('settings.deletion.button')` → `t('settings.delete_button')`
- Keep dialog keys (`confirmTitle`, `confirmDescription`, `typeToConfirm`, etc.) under `settings.deletion.*`

**`src/components/settings/MentorCVConsentToggle.tsx`** (~3 key swaps):
- Line 141: `t('settings.cv_consent_title', ...)` → `t('settings.mentor_cv_title')`
- Line 148: `t('settings.no_mentor_for_cv', ...)` → `t('settings.mentor_cv_incomplete')`
- Line 174: `t('settings.cv_consent_title', ...)` → `t('settings.mentor_cv_title')`
- Line 177: `t('settings.cv_consent_desc', ...)` → `t('settings.mentor_cv_body')`

### File count: 8 (3 JSON + 5 TSX)

