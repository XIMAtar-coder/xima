

# Phase 1 — Semantic Status Rename Review + Execution

## Status Reference Analysis

### 1. HiringGoalCard.tsx line 107
```js
query = query.neq('status', 'completed').order('updated_at', { ascending: false }).limit(1);
```
**Context**: Fetches the most recent goal that is NOT "fully submitted" — i.e., finds an in-progress draft to resume editing in the wizard.
**Semantic meaning**: "give me a goal still being drafted"
**Correct fix**: `.eq('status', 'draft')` — explicitly fetch only drafts. The original `.neq('completed')` was a shortcut when only two statuses existed. Now with 5 statuses, we must be explicit: only drafts should be resumed in the wizard. Active/paused/filled/closed goals are done being edited.

### 2. HiringGoalCard.tsx line 313
```js
status: 'completed'
```
**Context**: Final submission payload — wizard is done, all fields validated, goal is "ready to use."
**Semantic meaning**: "form is fully filled out, activate this goal"
**Correct fix**: `status: 'active'`

### 3. Dashboard.tsx line 59
```ts
const [hiringGoalStatus, setHiringGoalStatus] = useState<'none' | 'draft' | 'completed'>('none');
```
**Context**: UI state variable tracking whether the business has no goal, a draft, or a ready goal.
**Semantic meaning**: Three-state lifecycle indicator for dashboard routing.
**Correct fix**: `'none' | 'draft' | 'active'`

### 4. Dashboard.tsx line 132
```js
else if (data.status === 'completed') { setHiringGoalStatus('completed'); ... }
```
**Context**: Reads the most recent goal's status and maps it. If status is "ready/submitted", set UI state accordingly.
**Semantic meaning**: "is this goal fully set up and live?"
**Correct fix**: `data.status === 'active'` → `setHiringGoalStatus('active')`. Also add: `else if (['paused','filled','closed'].includes(data.status)) { setHiringGoalStatus('active'); ... }` — these are all "past draft" states that should show the same dashboard experience.

### 5. Dashboard.tsx line 141
```js
if (hiringGoalDraftId && hiringGoalStatus === 'completed') {
```
**Context**: Scopes shortlist count query to the specific goal only when the goal is ready.
**Semantic meaning**: "goal is ready, show its shortlist stats"
**Correct fix**: `hiringGoalStatus === 'active'`

### 6. HiringGoalOverviewCard.tsx line 101
```js
{goal.status !== 'active' && goal.status !== 'completed' && (
```
**Context**: Show "Activate" menu item only if goal is neither active nor completed (i.e., show for draft/paused/closed).
**Semantic meaning**: "can this goal be activated?"
**Correct fix**: Remove `&& goal.status !== 'completed'` — `completed` won't exist anymore. Keep `goal.status !== 'active'`.

### 7. HiringGoalOverviewCard.tsx line 107
```js
{(goal.status === 'active' || goal.status === 'completed') && (
```
**Context**: Show "Pause" menu item only if goal is currently live.
**Semantic meaning**: "is this goal pausable?"
**Correct fix**: Remove `|| goal.status === 'completed'`. Keep `goal.status === 'active'`.

## CHECK Constraint Value: `closed` not `archived`

The existing frontend (HiringGoalOverviewCard lines 113-116) already uses `'closed'` with `t('business.goals.close')`. The memory doc confirms `draft|active|paused|filled|closed`. The migration will use `closed`, not `archived`.

## Final Migration SQL

```sql
ALTER TABLE hiring_goal_drafts DROP CONSTRAINT hiring_goal_drafts_status_check;
ALTER TABLE hiring_goal_drafts DROP CONSTRAINT hiring_goal_completed_fields_check;

ALTER TABLE hiring_goal_drafts ADD CONSTRAINT hiring_goal_drafts_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'filled', 'closed'));

ALTER TABLE hiring_goal_drafts ADD CONSTRAINT hiring_goal_active_fields_check
  CHECK ((status <> 'active') OR (
    task_description IS NOT NULL AND task_description <> '' AND
    experience_level IS NOT NULL AND work_model IS NOT NULL AND
    country IS NOT NULL AND country <> '' AND
    salary_min IS NOT NULL AND salary_max IS NOT NULL AND
    salary_min <= salary_max AND salary_currency IS NOT NULL AND
    salary_period IS NOT NULL
  ));

UPDATE hiring_goal_drafts SET status = 'active' WHERE status = 'completed';
```

Then immediately: remaining 5 migrations (is_template, job_posts extension, usage counters, admin_notifications, saved_candidates) + frontend status fixes above.

## Summary of Frontend Changes

| File | Line | Old | New | Reasoning |
|------|------|-----|-----|-----------|
| HiringGoalCard.tsx | 107 | `.neq('status','completed')` | `.eq('status','draft')` | Fetch only resumable drafts |
| HiringGoalCard.tsx | 313 | `status:'completed'` | `status:'active'` | Wizard submission activates goal |
| Dashboard.tsx | 59 | `'completed'` type | `'active'` type | UI state enum |
| Dashboard.tsx | 132 | `=== 'completed'` | `=== 'active'` + handle paused/filled/closed as active-tier | Goal is past draft stage |
| Dashboard.tsx | 141 | `=== 'completed'` | `=== 'active'` | Scope shortlist to ready goals |
| HiringGoalOverviewCard.tsx | 101 | `!== 'completed'` | remove clause | completed gone |
| HiringGoalOverviewCard.tsx | 107 | `=== 'completed'` | remove clause | completed gone |

Post-migration verification: `SELECT status, count(*) FROM hiring_goal_drafts GROUP BY status;` + `SELECT is_template, count(*) FROM business_challenges GROUP BY is_template;`

