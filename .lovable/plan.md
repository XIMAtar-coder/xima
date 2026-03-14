

## Plan: Update Homepage Copy + Add Problem Section

### Current State
- `Index.tsx` uses keys: `hero.title`, `hero.subtitle`, `hero.cta`, `hero.for_business`, `cta_section.*`, `pillars.*` (via PillarsShowcase), `home.recommended_challenges.*`, `home.job_matches.*`
- The `home` namespace exists but only has `recommended_challenges` and `job_matches` sub-keys
- No "problem" section exists between hero and pillars

### Changes

**1. Three locale files** (`src/i18n/locales/en.json`, `it.json`, `es.json`)

For each file:
- Replace `hero.title` → new headline, `hero.subtitle` → new subheadline, `hero.cta` → new primary CTA, `hero.for_business` → new secondary CTA
- Add `hero.eyebrow` key
- Replace `cta_section.title`, `cta_section.subtitle`, `cta_section.button` with new CTA copy
- Add all new keys under `home.*`: `problem_*`, `pillars_*`, `pillar_1-5_*`, `ximatar_*`, `archetype_*`, `footer_tagline` — merge into existing `home` object alongside `recommended_challenges` and `job_matches`

**2. `src/pages/Index.tsx`** — Update to use new keys + add problem section

- Add eyebrow text above hero: `{t('hero.eyebrow')}` in a small caps styled span
- Update hero headline/subtitle/CTA keys (already mapped, just content changes via JSON)
- **Add problem section** between hero and `<PillarsShowcase />`:
  - Glass card with `home.problem_label`, `home.problem_headline`, `home.problem_body`, `home.problem_pullquote`
  - Styled consistently: `glass-card` or `bg-card border border-border rounded-2xl p-8`, same max-width and padding as other sections
- Update CTA section keys (already mapped via JSON)
- Add footer tagline using `home.footer_tagline` below CTA section

**3. No changes** to PillarsShowcase, routing, layout, or component structure. The pillars showcase keeps its own `pillars.*` keys — the new `home.pillars_*` and `home.pillar_*` keys are available for future use or can be referenced if we later refactor PillarsShowcase.

### File count: 4 files (3 JSON + Index.tsx)

