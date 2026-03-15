

## Plan: Rewrite Business Page — Copy, Pipeline, Pricing, Trust Sections

### Current State

- **Business.tsx** (120 lines): Simple page with hero, 4 feature cards, CTA. No eyebrow, no pipeline, no pricing, no trust section.
- **Locale keys** (EN 2274–2300, IT 2146–2172, ES 1518–1544): Flat keys under `business.*` — `hero_title`, `hero_subtitle`, `get_started`, `sign_in`, `features_title`, `feature_1_title/desc` through `feature_4_title/desc`, `cta_title`, `cta_subtitle`, `start_free_trial`. Also contains `nav.*`, `command_center.*` and other nested keys that **must not be touched**.

### Changes: 4 files

**1–3. Three locale files** — Replace only the marketing keys (`hero_title` through `start_free_trial`, lines before `command_center`) with the new `business.*` keys from the user's spec. Add all new keys (`eyebrow`, `why_*`, `pipeline_*`, `pricing_*`, `plan1–3_*`, `trust_*`, `cta_*`). Keep `nav`, `command_center`, `level2`, `level3`, and all other nested business keys untouched.

Key mapping (old → new):
- `hero_title` → `hero_headline`, `hero_subtitle` → `hero_subheadline`
- `get_started` → `hero_cta_primary`, `sign_in` → `hero_cta_secondary`
- `features_title` → removed (replaced by `why_headline`)
- `feature_1_title/desc` → `feature1_title/body` (×4)
- `cta_title` → `cta_headline`, `cta_subtitle` → `cta_body`, `start_free_trial` → `cta_primary`
- New keys: `eyebrow`, `why_label/headline/subheadline`, `pipeline_label/headline/subheadline`, `pipeline_step1–4_*`, `pricing_label/headline/subheadline`, `plan1–3_*`, `trust_label/headline`, `trust_1–4_*`, `cta_secondary`

**4. `src/pages/Business.tsx`** — Major expansion from 120 to ~300 lines. New section order:

1. **Hero** — `eyebrow` as `font-mono text-xs uppercase tracking-widest text-primary`, `hero_headline` with `whitespace-pre-line`, `hero_subheadline`, two CTA buttons (`hero_cta_primary` → `/business/register`, `hero_cta_secondary` → `/business/login`)

2. **Why XIMA** — `why_label` monospace eyebrow, `why_headline` with `whitespace-pre-line`, `why_subheadline`, then 4 feature cards (`feature1–4_title/body`) in `grid md:grid-cols-2 gap-6`. Icons: `Users` (Behavioral Matching), `Layers` (Pipeline), `Shield` (Audit Trail), `Building2` (SMB). Each card renders full body text without truncation.

3. **Pipeline** (NEW) — `pipeline_label/headline/subheadline` header, `grid md:grid-cols-2 gap-8`, 4 steps each with `pipeline_stepN_number` in `text-5xl font-bold text-primary`, `pipeline_stepN_title` heading, `pipeline_stepN_body` description.

4. **Pricing** (NEW) — `pricing_label/headline/subheadline` header, `grid md:grid-cols-3 gap-6`, 3 plan cards. Each: badge pill, price `text-4xl font-bold`, period muted, tagline, 5 features with `Check` icons, CTA button. Growth card gets `border-primary border-2` + `plan2_highlight` badge. Starter/Growth CTAs → `/contact-sales`, Enterprise CTA → `/contact-sales`.

5. **Trust** (NEW) — `trust_label/headline` header (`whitespace-pre-line`), `grid md:grid-cols-2 gap-6`, 4 items with `ShieldCheck` icon, title bold, body muted.

6. **CTA** — `cta_headline` with `whitespace-pre-line`, `cta_body` (replaces false social proof), `cta_primary` button → `/business/register`, `cta_secondary` outline button → `/contact-sales`.

New imports: `Check, Layers, ShieldCheck, Building2` from lucide-react (add to existing import). Link component from react-router-dom already imported.

### File count: 4 (3 JSON + Business.tsx)

