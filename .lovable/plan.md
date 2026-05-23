# Chi Siamo — Full Redesign Plan

## Phase 0 — Preflight findings

- **File**: `src/pages/About.tsx` (single file, already wraps `LandingLayout` and uses `Seo`). Route `/about` is preserved.
- **i18n**: namespace `about.*` already exists in `src/i18n/locales/{it,en,es}.json` (line ~1258 in `it.json`). It will be **replaced wholesale** with the new key tree from the brief (`about.hero.*`, `about.origin.*`, `about.principles.*`, `about.problem.*`, `about.model.*`, `about.archetypes.*`, `about.team.*`, `about.stats.*`, `about.value.*`, `about.cta.*`).
- **Assets available**:
  - `public/images/assessment-layers.png` ✅ (hero right)
  - `public/images/problem-cv-breaking.png` ✅ (Il Problema)
  - `public/ximatars/{bear,bee,cat,chameleon,dolphin,elephant,fox,horse,lion,owl,parrot,wolf}.png` ✅ (12 archetypes)
  - `public/avatars/pietro-cozzi.jpg` ✅ and `public/avatars/daniel-cracau.jpg` ✅ (founders)
  - **Missing**: `public/images/origin-engineering.png` — will render a dark navy card with subtle grid pattern as placeholder (per brief).
- **Shared CTA**: `src/components/landing/LandingFinalCTA.tsx` exists and is the same dark gradient CTA used on Come Funziona — will be reused as-is for Section 10.
- **Out of scope (untouched)**: `src/pages/Index.tsx`, `src/pages/HowItWorks.tsx`, any authenticated pages, any edge functions, all other landing components.

## What I'll build

Rewrite `src/pages/About.tsx` end-to-end into 10 sections, all wrapped in `LandingLayout`, all copy via `t()`. Sections and structure follow the mockup exactly:

1. **Hero** — 2-col: text left (eyebrow `// CHI SIAMO`, h1 with "Ingegneri"/"Persone" in XIMA blue, body, pull quote with left border) + `assessment-layers.png` right (~350-400px).
2. **L'Origine** — 2-col: dark navy placeholder card with grid pattern (40%) + headline "Da Sistemi Embedded a Identità Comportamentali." with 3 body paragraphs (60%).
3. **Principles strip** — 3 columns in one white card with vertical separators: `Network`, `Hexagon`, `ShieldCheck` lucide icons (blue outline) + labels.
4. **Il Problema** — dark gradient banner (navy `#071E3A → #0A2A5E`): text left + `problem-cv-breaking.png` (~300px) right.
5. **Il Modello** — centered headline + 5 pillar cards in a horizontal row (`Zap`, `Lightbulb`, `BookOpen`, `MessageCircle`, `Cpu`) + italic closing quote.
6. **12 Archetipi** — pale blue background tint (`hsl` token mapped to `#F0F5FF` light / dark-mode equivalent), 12 circular XIMAtar avatars (80px) with names, descriptive paragraph below.
7. **Le Persone dietro XIMA** — headline + 2 founder cards (Pietro Cozzi, Daniel Cracau) with real avatars from `public/avatars/`. No third person, no fake names.
8. **Stats strip** — 5 columns (Team multidisciplinare / 25+ Persone / 8 Discipline / 4 Paesi / 1 Missione) with blue numbers + muted labels + muted icons.
9. **Due Entrate. Un Sistema.** — 2-col value props: "Per i Candidati" (5 checks) + "Per le Aziende" (5 checks), blue check icons.
10. **Final CTA** — reuse existing `<LandingFinalCTA />` (dark gradient, compact). Footer comes from `LandingLayout`.

## Design language

- All colors via existing CSS tokens (`--xima-blue`, `--background`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `accent-gradient`, `premium-card`) — no arbitrary hex in components. The pale-blue Section 6 background uses a CSS-variable surface that adapts in dark mode.
- Typography matches the rest of the landing (existing Manrope/Inter pairing).
- All comment labels (`// CHI SIAMO`, `// L'ORIGINE`, etc.) use mono-uppercase tracking-widest, same treatment as current landing pages.
- Dark-banner sections (Il Problema, Final CTA) stay dark in both themes. All other sections adapt via tokens.

## Responsive

- Desktop: layouts as described above.
- Tablet (`md` breakpoint): hero, L'Origine, value-props collapse to single column; pillar row wraps to 2/3 per row; archetype grid wraps.
- Mobile: everything single column; stats strip becomes 2×2 + 1 centered; archetype grid 4×3 (80px → 64px).

## i18n

Replace the existing `about` block in all three locale files with the new tree:

```
about.hero.{label,title,body,quote}
about.origin.{label,title,paragraphs[]}
about.principles.{p1,p2,p3}
about.problem.{label,title,body}
about.model.{label,title,pillars.{drive,creativity,knowledge,communication,computation}.{name,body},quote}
about.archetypes.{label,title,names.{bear,…,wolf},body}
about.team.{label,title,subtitle,members.{pietro,daniel}.{name,role,bio}}
about.stats.{team,people,disciplines,countries,mission}
about.value.{label,title,subtitle,candidates.{label,items[]},business.{label,items[]}}
about.cta.{title,primary,secondary}
```

Italian copy uses the exact text from the brief. English + Spanish translated naturally, same direct non-corporate voice.

## Out of scope

Homepage, Come Funziona, authenticated pages, edge functions, founder identity (only Pietro Cozzi + Daniel Cracau).

## Files changed

- `src/pages/About.tsx` — full rewrite
- `src/i18n/locales/it.json` — replace `about.*` subtree
- `src/i18n/locales/en.json` — replace `about.*` subtree
- `src/i18n/locales/es.json` — replace `about.*` subtree

No new dependencies. No new images committed (the missing `origin-engineering.png` is rendered as a styled placeholder per brief).
