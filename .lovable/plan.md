

## Plan: Rewrite About Page Copy + Add Founder Section + Update Stats

### Current State
- `About.tsx` already uses the correct pillar data and key pattern (`about.pillar_${key}`)
- Origin section exists but uses single `origin_body` key — needs split into 3 paragraphs
- Stats section uses old values (80%+, 12, 97.7%, 5) with `stats_label`/`stats_headline` keys
- No founder section exists
- EN: lines 943-1019, IT: lines 1078-1154, ES: lines 1071-1147

### Changes: 4 files

**1. Three locale files** — Replace entire `about` namespace in each

- EN (lines 943-1019): Replace with new copy — adds `origin_body_1/2/3` (replaces single `origin_body`), adds `founder_*` keys (label, headline, role, body_1/2/3, pullquote), changes `approach_label`/`approach_headline`, updates stats to `numbers_label`/`numbers_headline`/`numbers_subheadline` + new stat values (5, 12, 21, 4)
- IT (lines 1078-1154): Same structure replacement
- ES (lines 1071-1147): Same structure replacement

Key changes from current → new:
- `origin_body` → `origin_body_1`, `origin_body_2`, `origin_body_3`
- New: `founder_label`, `founder_headline`, `founder_role`, `founder_body_1/2/3`, `founder_pullquote`
- `approach_label` "// THE APPROACH" → "// THE MODEL", `approach_headline` "The XIMA Approach" → "How XIMA Works"
- `stats_label` → `numbers_label`, `stats_headline` → `numbers_headline`, new `numbers_subheadline`
- Stat values: 80%+ → 5, 12 stays, 97.7% → 21, 5 → 4

**2. `src/pages/About.tsx`** — Update keys + add founder section + split origin body

- **Origin section** (lines 85-87): Replace single `origin_body` paragraph with three paragraphs using `origin_body_1`, `origin_body_2`, `origin_body_3`

- **Add Founder section** — Insert between origin and problem sections (after line 89). Glass card with:
  - `founder_label` as mono label
  - `founder_headline` as large heading
  - `founder_role` as subtitle in `text-muted-foreground`
  - Three body paragraphs (`founder_body_1/2/3`)
  - `founder_pullquote` italic centered below, with `border-t`

- **Stats section** (lines 260-277): Update key references from `stats_label` → `numbers_label`, `stats_headline` → `numbers_headline`, add `numbers_subheadline` below headline

### File count: 4 files (3 JSON + About.tsx)

