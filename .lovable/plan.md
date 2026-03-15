

## Plan: Rewrite How It Works Page — Copy + Structure

### Current State

**Locale files** — Keys consumed by the HowItWorks page and its child components:
- `how_it_works.title` / `how_it_works.subtitle` (EN line 1042, IT line 1177, ES line 1170)
- `pillars.*` (EN line 313, IT line 196) — shared namespace used by XimaPillars component and also the About page/PillarsShowcase. **Must not be replaced** — the new `howItWorks.pillars_*` keys will be consumed separately.
- `process.step1–4` (EN line 1231, IT line 1367) — consumed by Process.tsx
- `avatar_explanation.*` (EN line 1250, IT line 1386) — consumed by AvatarExplanation.tsx
- `cta_section.*` (EN line 442, IT line 333) — consumed by CallToAction.tsx and possibly other pages

**Components:**
- `HowItWorks.tsx` — parent page, references `how_it_works.*`, `pillars.*`, `guide.badge`
- `Process.tsx` — 4 journey step cards, references `process.step1–4`
- `XimaPillars.tsx` — 5 pillar cards with strength/weakness, references `pillars.*`
- `AvatarExplanation.tsx` — 3 archetype examples (owl/fox/wolf), references `avatar_explanation.*`
- `CallToAction.tsx` — CTA card, references `cta_section.*`

**12 XIMAtar images** available: bear, bee, cat, chameleon, dolphin, elephant, fox, horse, lion, owl, parrot, wolf

### Changes: 7 files

**1–3. Three locale files** — Add `howItWorks` namespace (new top-level key) with all provided copy verbatim. Do NOT remove existing `how_it_works`, `process`, `pillars`, `avatar_explanation`, or `cta_section` keys (they may be used elsewhere).

**4. `src/pages/HowItWorks.tsx`** — Major rewrite. Remove child component imports (Process, XimaPillars, AvatarExplanation, CallToAction). Inline all sections using `howItWorks.*` keys. New section order:

1. **Hero** — `eyebrow` as `font-mono text-xs uppercase tracking-widest text-primary`, `hero_headline` with `whitespace-pre-line`, `hero_subheadline`, `hero_pullquote` italic centered, `hero_cta` button linking to `/assessment-guide`
2. **Journey** — `journey_label/headline/subheadline` header, then 4 step cards (reuse Process card styling, keys `step1_title/body` through `step4_title/body`)
3. **Pipeline** (NEW) — `pipeline_label/headline/subheadline` header, `grid md:grid-cols-3 gap-6`, 3 cards with badge pills (L1/L2 accent, L3 muted), title, body
4. **Pillars** — `pillars_label/headline/subheadline` header (`whitespace-pre-line` on headline), 5 pillar cards with `pillar1_name/body/strength/friction` (keep icon array from XimaPillars), `pillars_archetype_logic` text, `pillars_pullquote` italic centered
5. **Identity** — `identity_label/headline/subheadline` header (`whitespace-pre-line` on headline), show all 12 XIMAtar images in a grid (4×3 on desktop, 3×4 on tablet, 2×6 on mobile) using `/ximatars/*.png`, `identity_portability` italic below
6. **CTA** — `cta_headline` with `whitespace-pre-line`, `cta_body`, `cta_button` primary button → `/ximatar-journey`, `cta_secondary` outline button → `/assessment-guide`

**5–7. Delete child components** that are no longer imported:
- `src/components/how-it-works/Process.tsx` — will be inlined
- `src/components/how-it-works/XimaPillars.tsx` — will be inlined
- `src/components/how-it-works/AvatarExplanation.tsx` — will be inlined
- `src/components/how-it-works/CallToAction.tsx` — will be inlined

Wait — these components might be used elsewhere. Let me verify before deleting.

Actually, safer approach: **keep the child component files unchanged** but stop importing them in HowItWorks.tsx. Inline all content directly in HowItWorks.tsx using the new `howItWorks.*` keys. The old components remain available if referenced elsewhere.

### Technical Details

- Pillar icons reused inline: `Brain` (Computational), `MessageCircle` (Communication), `BookOpen` (Knowledge), `Lightbulb` (Creativity), `Zap` (Drive)
- Pipeline badge styling: L1/L2 → `bg-primary/10 text-primary text-xs font-mono px-3 py-1 rounded-full`, L3 → `bg-muted text-muted-foreground text-xs font-mono px-3 py-1 rounded-full`
- Identity grid: 12 animals displayed as `w-16 h-16 rounded-full object-cover` in `grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4` centered
- Eyebrow labels follow the `// LABEL` monospace pattern per project memory
- Strength/friction styling: green for strength (`text-green-600 dark:text-[hsl(142,71%,45%)]`), orange for friction (`text-orange-600 dark:text-[hsl(33,100%,50%)]`)

### File count: 4 files (3 JSON + HowItWorks.tsx rewrite). No deletions.

