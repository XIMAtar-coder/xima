

## Plan: Complete About Page Rewrite — Copy, Structure, Team Section

### Scope
Replace all `about` namespace content in 3 locale files + rewrite `About.tsx` component structure significantly.

### Current State
- EN: lines 943–1030, IT: lines 1078–1165, ES: lines 1071–1158
- About.tsx: 359 lines, has hero, origin, founder (Pietro only), problem, approach/pillars, benefits, stats, CTA
- Pillars render single-line `pillar_1` through `pillar_5` — new copy splits into `pillar_X_name` + `pillar_X_body`
- No Daniel Cracau / advisor section exists
- No model pullquote, no ximatar label, no value subsection headlines
- Founder section uses old keys (`founder_headline`, `founder_body_1/2/3`, `founder_pullquote`) — new copy replaces with `founder_name`, `founder_bio` (single paragraph), removes Nexus Lab references

### Changes: 4 files

**1–3. Three locale files** — Replace entire `about` namespace (EN 943–1030, IT 1078–1165, ES 1071–1158) with provided copy verbatim.

Key differences from current:
- `founder_label` changes from "// THE FOUNDER" → "Founder" (now a badge, not section label)
- `founder_headline` → `founder_name`, `founder_body_1/2/3` → single `founder_bio`, `founder_pullquote` removed
- `founder_role` updated to remove Nexus Lab references
- New keys: `advisor_*` (label, name, role, bio_1/2/3, pullquote), `team_*` (label, headline, subheadline)
- `approach_label/headline` → `model_label/headline` + `model_body` + `model_pullquote`
- `pillar_1` → `pillar_1_name` + `pillar_1_body` (×5)
- Old keys removed: `pillars_title`, `pillars_body`, `ximatar_title`, `why_animals_*`, `morphology_*`, `mentor_*`, `benefits_label/headline`, `candidates_title`, `employers_title`
- New keys: `ximatar_label`, `ximatar_headline`, `value_label/headline/subheadline`, `candidates_label/headline`, `employers_label/headline`
- `numbers_headline` gains `\n`, `cta_headline` gains `\n`

**4. `src/pages/About.tsx`** — Major restructure

**Section order (new):**
1. Hero (eyebrow, headline, subheadline, pullquote) — minimal key updates only
2. Origin (3 paragraphs) — same structure, minor key updates
3. Problem — update all keys to new assertive copy
4. Model (replaces Approach) — new section with `model_label`, `model_headline`, `model_body`, then 5 pillar cards each showing `pillar_X_name` as bold heading + `pillar_X_body` as description, then `model_pullquote` italic centered
5. XIMAtar — add `ximatar_label`, `ximatar_headline`, `ximatar_body` (remove why_animals, morphology, mentor subsections)
6. Value (replaces Benefits) — `value_label/headline/subheadline`, then two subsections each with their own `candidates_label/headline` and `employers_label/headline`, checkmark bullet items
7. Numbers (Stats) — add `whitespace-pre-line` on headline, same grid
8. Team (NEW) — `team_label/headline/subheadline`, then `grid md:grid-cols-2 gap-8` with two glass cards:
   - Pietro: circular photo (`/avatars/pietro-cozzi.jpg`, `w-20 h-20 rounded-full object-cover`), `founder_label` badge, `founder_name` heading, `founder_role` muted, `founder_bio` body
   - Daniel: circular photo (`/avatars/daniel-cracau.jpg`, same treatment), `advisor_label` badge, `advisor_name` heading, `advisor_role` muted, 3 bio paragraphs, `advisor_pullquote` italic with `border-t`
9. CTA — add `whitespace-pre-line` on headline

**Removed from current About.tsx:**
- Old founder section (lines 99–137) — replaced by team section at position 8
- Why Animals, Morphology, Mentor subsections from approach section
- `pillars_title`/`pillars_body` header (replaced by model intro)

**Pillar card change:** From single-line `t('about.pillar_${key}')` → two elements: `t('about.pillar_${key}_name')` as bold heading + `t('about.pillar_${key}_body')` as description paragraph below. Keep color bar styling.

### File count: 4 (3 JSON + About.tsx)

