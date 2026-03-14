

## Plan: Update Assessment Guide Page Copy + Add Governance Section

### Current State
- `AssessmentGuide.tsx` uses `guide.*` keys (e.g., `guide.step1.title`, `guide.pillars_title`) with **inline fallback strings only** — no keys exist in any locale JSON file
- Page has: hero, journey steps, pillars (with "20%" badges), scoring example, XIMAtar grid, assignment logic, CTA
- Missing: governance section, new copy

### Changes: 4 files

**1. Three locale files** (`en.json`, `it.json`, `es.json`)
- Add full `assessmentGuide` namespace with all provided keys (hero, journey, steps 1-4, pillars 1-5, example, archetypes, assignment, governance, CTA)

**2. `src/pages/AssessmentGuide.tsx`** — Update all `t()` calls + add governance section + remove 20% badges

- **Hero**: Replace `guide.badge` → `assessmentGuide.eyebrow`, `guide.title` → `assessmentGuide.hero_headline` (with `whitespace-pre-line`), `guide.subtitle` → `assessmentGuide.hero_subheadline`

- **Journey section**: Replace `guide.journey_title` → `assessmentGuide.journey_headline`, add label and subheadline. Update step titles/descriptions to `assessmentGuide.step1_title`/`step1_body` etc. Replace `guide.step` → `assessmentGuide.step1_badge` etc.

- **Pillars section**: Replace `guide.pillars_title` → `assessmentGuide.pillars_headline`, add label. Update each pillar's `name` and `description` to use `assessmentGuide.pillar1_name`/`pillar1_body`. **Remove the `weight: '20%'` property and the `<Badge>{pillar.weight}</Badge>` element** from each pillar card.

- **Scoring example**: Replace `guide.scoring_title` → `assessmentGuide.example_headline`, add label. Replace description and result text with new keys.

- **XIMAtar grid**: Replace title/description. Update each ximatar's `name` → `assessmentGuide.archetype_X_name`, `style` → `assessmentGuide.archetype_X_role`, `strength` → `assessmentGuide.archetype_X_pillar`.

- **Assignment logic**: Replace title and all 4 step titles/descriptions with `assessmentGuide.assignment_*` keys. Add label above.

- **Add Governance section** between XIMAtar grid and Assignment Logic sections:
  - New `<section>` with same animation pattern
  - Label (`assessmentGuide.governance_label`) + headline + subheadline
  - 2x2 grid on desktop (`grid md:grid-cols-2 gap-6`), stacked on mobile
  - Each item: title + body from `governance_1_title`/`governance_1_body` through `governance_4_*`
  - Pullquote below: italic, centered, `assessmentGuide.governance_pullquote`
  - Styled as glass card (`bg-card border border-border rounded-2xl p-8`)

- **CTA**: Replace all keys with `assessmentGuide.cta_headline`, `cta_body`, `cta_primary`, `cta_secondary`.

### No changes to routing, layout structure, animations, or component imports (except removing Badge usage from pillar weight).

