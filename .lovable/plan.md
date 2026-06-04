## Context

A `SECURITY DEFINER` RPC `invite_candidate_to_l1(p_candidate_user_id uuid, p_hiring_goal_id uuid)` already exists. It resolves `candidate_profile_id` and creates the L1 XIMA Core Challenge invitation server-side. The shortlist invite currently fails silently because the client tries to resolve `profiles.id` under RLS that blocks business reads. The shortlist also exposes a challenge picker that can target L2 — must go. L2 invitations belong only to the L1 review / Evaluations flow.

`browse-candidate-pool` injects synthetic placeholder cards (`is_synthetic: true`, ids like `synthetic-lion`) when the real pool is small. These must never be invitable.

## Files to touch

1. `src/components/business/ShortlistView.tsx` — strip challenge picker + activeChallenges gating; call the L1 RPC directly; track invited state.
2. `src/components/business/ShortlistCard.tsx` — accept `invited?: boolean`, swap CTA to disabled "Invited" pill; drop `inviteDisabled*`.
3. `src/pages/business/GoalShortlistPage.tsx` — drop `activeChallenges` load, `handleInviteToChallenge` profile-resolution block, `challengeCreated` toast, and the `onInviteToChallenge`/`activeChallenges` props passed to `ShortlistView`.
4. `src/pages/business/Candidates.tsx` — replace challenge-picker invite with goal-selector + L1 RPC; defensive synthetic guard.
5. `src/components/business/PoolCandidateCard.tsx` — when `is_synthetic`, hide "Invita" CTA and show "Profilo di esempio" badge.

No new SQL — RPC already exists.

## Behaviour changes

### Shortlist (`ShortlistView` + `ShortlistCard`)

- Remove `ChallengePickerModal`, `pendingInviteIds`, `showChallengePicker`, `confirmChallengeSelection`, `activeChallenges`/`challengeLoading` props, `inviteDisabled`/`inviteDisabledReason`, and the "Create Challenge for this role" banner.
- New `ShortlistView` props: `goalId`, `roleTitle`, `onViewProfile`. Invite handled internally.
- Track `invitedIds: Set<string>` in state.
- `handleInviteL1(candidateUserId)`:
  ```ts
  const { error } = await supabase.rpc('invite_candidate_to_l1', {
    p_candidate_user_id: candidateUserId,
    p_hiring_goal_id: goalId,
  });
  if (error) { toast({ title: 'Invite failed', description: error.message, variant: 'destructive' }); return; }
  setInvitedIds(prev => new Set(prev).add(candidateUserId));
  toast({ title: t('shortlist.invited_title', 'Invited to L1 Core Challenge') });
  ```
- "Invite Top 5" loops top 5 not-yet-invited ids sequentially; one aggregate toast with success count.
- `ShortlistCard` receives `invited` — when true the primary button becomes a disabled "Invited" chip (CheckCircle icon). All `inviteDisabled*` props removed.

### Shortlist page (`GoalShortlistPage`)

- Remove `activeChallenges`, `challengeLoading`, `loadActiveChallenges`, `challengeCreated` query handling, and the entire `handleInviteToChallenge` block.
- `<ShortlistView>` simplifies to `goalId`, `roleTitle`, `onViewProfile`.

### Pool (`Candidates.tsx`)

- Remove `allChallenges` load, `ChallengePickerModal` usage, `executeInvite`, `pendingInviteId`, `showChallengePicker`.
- Add `selectedGoalId: string | null` state and a small `<select>` in the header listing this business's hiring goals (loaded from `hiring_goal_drafts` where `business_id = user.id`).
- `handleInvite(candidate)`:
  - **If `candidate.is_synthetic` → return early (defensive, no toast).**
  - If `!selectedGoalId` → toast "Pick a hiring goal first" and focus the selector; no network call.
  - Else call `supabase.rpc('invite_candidate_to_l1', { p_candidate_user_id: candidate.id, p_hiring_goal_id: selectedGoalId })`; success/error toasts identical to shortlist.

### Pool card (`PoolCandidateCard`)

- When `candidate.is_synthetic`:
  - Do **not** render the "Invita" button; the save (bookmark) button is hidden too (synthetic cards have no real backing record).
  - Render a subtle badge in the actions row: `<Badge variant="outline" className="text-xs">{t('candidate_pool.sample_profile', 'Profilo di esempio')}</Badge>`.
- Real candidates: unchanged.

### Scope guard

- No code path in shortlist or pool inserts into `challenge_invitations` directly or calls `send-challenge-invitation` with a non-L1 challenge. L2 entry points remain in the L1 review / Evaluations flow (out of scope, unchanged).

## Verification

- Shortlist "Invite to Challenge" → single `rpc/invite_candidate_to_l1` call; success flips card to "Invited"; second click no-op; errors surface verbatim.
- `rg "ChallengePickerModal"` returns zero hits in `ShortlistView.tsx` and `Candidates.tsx`.
- `rg "challenge_invitations" src/` shows no remaining client inserts from shortlist/pool.
- Pool: synthetic cards show "Profilo di esempio" badge and no Invita button; clicking via any path (defensive) does nothing.
- Pool: real candidate with no selected goal → toast prompt, no network call. With goal → RPC call, success toast.
- DB check: `challenge_invitations` row lands with correct `candidate_profile_id` and the L1 XIMA Core Challenge `challenge_id`.
