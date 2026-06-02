# Revert: `business_id` = `user.id` across business pipeline

A recent change resolved `business_profiles.id` and sent that as `business_id` on inserts. The pipeline tables (`hiring_goal_drafts`, `job_posts`, `business_shortlists`, `business_challenges`) actually FK to `auth.users.id`, so inserts now fail RLS. Revert to using `user.id`.

## Files & lines to touch

### 1. `src/hooks/useHiringGoals.ts`
- Lines 25–43 — **delete** the `getCurrentBusinessProfileId()` helper and its doc comment.
- Lines 50–58 (`fetchGoals`) — replace the profile lookup with `supabase.auth.getUser()`; filter `.eq('business_id', user.id)`.
- Lines 115–117 (`createGoal`) — same; insert `business_id: user.id`.

### 2. `src/pages/business/HiringGoalCreate.tsx`
- Line 16 — **remove** `import { useBusinessProfile } from '@/hooks/useBusinessProfile'` (not used elsewhere in this file).
- Line 64 — remove `const { businessProfile } = useBusinessProfile();`.
- Line 165 — remove `if (!businessProfile?.id) throw …` (the `user` guard on line 164 is sufficient).
- Line 172 — `business_id: businessProfile.id` → `business_id: user.id`.
- Line 204 already correct (`business_id: user.id` to `request-xima-hr`).

### 3. `src/pages/business/JobImportWizard.tsx`
- Line 15 — **remove** `import { useBusinessProfile } from '@/hooks/useBusinessProfile'`.
- Line 116 — remove `const { businessProfile } = useBusinessProfile();`.
- Line 174 already correct (`business_id: user!.id` in `buildJobPostRow`).
- Line 234 — remove `if (!businessProfile?.id) throw …`; add a `user?.id` guard instead.
- Line 238 — `business_id: businessProfile.id` → `business_id: user!.id`.
- Lines 277 already correct (`business_id: user!.id`).

## Out of scope (verified, no change)

- `src/pages/business/Dashboard.tsx:134` — already `user.id`, untouched per instruction.
- `src/components/business/HiringGoalCard.tsx` (lines 102, 158, 302) — already uses `user.id`.
- `src/components/business/DiscoveredPositionsBanner.tsx`, `SubmissionDetailDrawer.tsx`, `Level2InviteModal.tsx`, `Level3InviteModal.tsx`, `CreateChallengeModal.tsx`, `ImportJobModal.tsx`, `SuggestFieldButton.tsx`, `TeamIntelligenceCard.tsx` — these receive a `businessId` prop; all current callers pass `user?.id` (verified via Dashboard wiring), so no change.
- `src/hooks/useCompanyLegal.ts` — writes to `company_legal`, not a pipeline table; leave alone.
- Mutual-interest flow (RPCs) — explicitly excluded; not touched.

## Flag for your review (not changing)

- `src/pages/business/Dashboard.tsx:251` passes `businessProfile?.id || user?.id` as `businessId` to `XimaHrRequestModal`, which forwards it to the `request-xima-hr` edge function. `HiringGoalCreate.handleSubmit` sends `user.id` to the same function. These should be consistent — but it's a function-invoke payload, not a direct pipeline-table write, so I'm leaving it unless you confirm.

## Verification after edits

- Re-run `rg "businessProfile\.id|getCurrentBusinessProfileId"` and confirm only `useCompanyLegal.ts` and the Dashboard XIMA-HR modal line remain.
- Smoke test: create a hiring goal, import a job post, convert to goal.
