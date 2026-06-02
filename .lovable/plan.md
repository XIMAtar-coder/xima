## Status

- ✅ Migration **applied** (RPC `public.get_member_codes(uuid[])` created, `EXECUTE` revoked from `public`/`anon`, granted only to `authenticated`).
- ⏳ Code edits below pending build-mode approval.

## Goal

Surface `profiles.subscriber_code` as a small, anonymity-preserving "Member #A001" badge on shortlist cards, candidate pool cards, and the candidate's own dashboard. Hide gracefully when missing.

## Code changes to apply

1. **`src/components/business/MemberCodeBadge.tsx`** *(new)* — small chip `{ code, variant?: 'default' | 'founding' }`; renders nothing when `code` is falsy. `default` uses `bg-muted/60` + `BadgeCheck`; `founding` uses amber accent + `Crown`.

2. **`src/components/business/ShortlistView.tsx`** (lines 62–86) — after the `shortlist_results` select, collect `candidate_user_id`s and call `supabase.rpc('get_member_codes', { _user_ids: ids })`, build a `Map`, attach `subscriber_code` to each row. **No direct `profiles` query.**

3. **`src/components/business/ShortlistCard.tsx`** — add `subscriber_code?: string | null` to interface; import `MemberCodeBadge`; render under the archetype name (next to `L{level}`), kept visually separate from the `#rank` circle and the `/100` score.

4. **`supabase/functions/browse-candidate-pool/index.ts`** — add `subscriber_code` to profiles select (~L76) and to the returned candidate object (~L340). Server runs as `service_role`, so direct read is fine.

5. **`src/components/business/PoolCandidateCard.tsx`** — add `subscriber_code?: string | null` to interface; import `MemberCodeBadge`; render under archetype title. Synthetic placeholders leave it null → badge hidden.

6. **`src/hooks/useProfileData.ts`** — add `subscriber_code`, `subscriber_no` to `profiles` select and to the returned state shape.

7. **`src/pages/Profile.tsx`** — render `<MemberCodeBadge code={profileData.subscriber_code} variant="founding" className="text-sm px-3 py-1" />` between the welcome `<h1>` and the subheadline.

## Out of scope

Pipeline/Kanban cards, mutual-interest flow, identity-reveal logic — unchanged.

## Verification

- `rg "subscriber_code"` appears in MemberCodeBadge, ShortlistView, ShortlistCard, PoolCandidateCard, Profile.tsx, useProfileData.ts, browse-candidate-pool/index.ts.
- Business shortlist card shows "Member #A001" under the archetype line.
- `/business/candidates`: real candidates show the badge; "Demo" synthetics do not.
- Candidate `/dashboard`: founding-styled chip under the welcome headline; absent if no code.
