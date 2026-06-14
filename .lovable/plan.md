## Phase 2.1b — Remove redundant inline wizard from Hiring Goals page

### Goal
On `/business/hiring-goals` keep only the goals portfolio + "New Goal" CTA, all pointing to the 5-step wizard at `/business/hiring-goals/new`. Remove the inline `HiringGoalCard` ("Dimmi cosa ti serve…") and the related "active goal saved" card.

### Files touched

**1. `src/pages/business/HiringGoals.tsx`** — simplify
- Remove imports: `HiringGoalCard`, `CheckCircle`, `Users`, `supabase`, `useBusinessRole`, `useToast`, `useUser`, `useEffect`, `useState` (keep only what's needed for the list).
- Remove state: `hiringGoalStatus`, `hiringGoalDraftId`, `hiringGoalLoading`.
- Remove `loadHiringGoalStatus` and its `useEffect`.
- Remove the inline `<HiringGoalCard …>` block.
- Remove the green "hiring goal saved" card (with "Generate shortlist" / "Edit" buttons).
- Keep header, the "I tuoi obiettivi" section, "Nuovo Obiettivo" button, empty-state, and the goals list.
- Auth/role gating: rely on `BusinessLayout` (it already protects business routes via existing pattern used by other business pages). If `BusinessLayout` does not gate, keep the minimal `useBusinessRole` redirect — confirmed during implementation by a quick check of one sibling page (e.g. `Candidates.tsx`).

**2. List content — include drafts as reopenable goals**
- Change `const activeGoals = hiringGoals.filter(g => g.status === 'active')` to show ALL non-closed goals (drafts, active, paused, filled). This ensures any in-progress draft created by the 5-step wizard surfaces in the list (per the "draft appears as reopenable goal" requirement). The existing `HiringGoalOverviewCard` already renders a draft badge and an "Edit" action.
- Rename the local var to `visibleGoals` for clarity.
- The "Edit" action in `HiringGoalOverviewCard` already navigates to `/business/goals/:id/edit`. Out of scope: changing that target. (If the user later wants drafts to resume in the 5-step wizard, that's a separate change.)

**3. `src/components/business/HiringGoalCard.tsx`** — delete
- Confirmed only consumers: `HiringGoals.tsx` (being removed) and a stale unused `import` in `Dashboard.tsx` (no JSX usage).
- Remove the stale `import { HiringGoalCard } …` line from `src/pages/business/Dashboard.tsx`.
- Delete the file `src/components/business/HiringGoalCard.tsx`.

**4. Overview stats coherence (Dashboard.tsx)** — no changes needed
- `Dashboard.tsx` computes `hiringGoalDraftId` / `hiringGoalStatus` by querying `hiring_goal_drafts` directly (most recent row). The 5-step wizard writes to the same table, so stats remain coherent automatically. No edits required.

### Out of scope
- The 5-step wizard (`HiringGoalCreate.tsx`).
- Other business pages, sidebar, routes.
- Behavior of "Edit" on drafts (still goes to existing `/business/goals/:id/edit`).
- i18n: no new keys needed (all reused).

### Verification
- `/business/hiring-goals` shows only header + portfolio list + "New Goal" CTA.
- All "New Goal" / "Create your first" buttons navigate to `/business/hiring-goals/new`.
- A draft created via the 5-step wizard appears in the list with the "Draft" badge.
- Dashboard Overview stats unchanged.
- `rg "HiringGoalCard"` returns no results after the change.
