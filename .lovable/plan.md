

# Phase 3B Execution — Ready to Execute

All preflight confirmed. The plan from the previous message is fully approved with three clarifications resolved. Here's the execution summary:

## Execution Order

### Step 1: Edge Function Fixes
1. **import-job-post** — Add `else if (importMethod === "paste")` handler after line 200 (after `ai_search` block closes, before the closing `}` of the JSON body branch)
2. **request-xima-hr** — Extend validation (lines 34-38) to accept `source: 'generic'` with optional `source_id`, skip source record update when generic

### Step 2: New Components
1. **BusinessEntryPointsCard.tsx** — 3-card grid (Target/FileUp/Users), visible when `hiringGoalStatus === 'none' || 'draft'`
2. **XimaHrRequestModal.tsx** — 2-screen modal (explain → confirm → success), calls request-xima-hr
3. **JobImportWizard.tsx** — 2-step wizard (paste/upload → editable review form → 3 action buttons)

### Step 3: Routing & Dashboard Wiring
- Add `/business/jobs/import` route in App.tsx (after line 156)
- Import BusinessEntryPointsCard + XimaHrRequestModal into Dashboard.tsx
- Render entry points card after CompanyIdentityCard when status is 'none' or 'draft'

### Step 4: i18n
- Add all keys to it.json, en.json, es.json under `business.dashboard.entry_points.*`, `business.jobs.import.*`, `business.xima_hr.modal.*`

### Key Technical Details
- **employment_type**: already extracted by Haiku (line 235) — no change needed
- **XIMA HR publish comment**: will be added above the job_posts insert
- **Seniority mapping TODO**: comment for Phase 3C granular display
- **salary_period**: forced to `'yearly'` per CHECK constraint
- **job_posts.salary_range**: text field, store formatted string like `"55000-70000 EUR/yr"`
- **request-xima-hr generic**: skip source record update, create notification with `source: 'generic'`, `source_id: null`

### Verification
- Deploy edge functions and check logs
- Test entry points card visibility (set Capgemini goal to draft, verify card shows, revert)
- Paste Italian Lead Engineer JD, verify Step 2 extraction
- Click "Attiva XIMA HR" from dashboard, verify admin_notifications row
- Click "Converti in Obiettivo XIMA", verify redirect to `/business/hiring-goals/new?from_listing=<id>`

