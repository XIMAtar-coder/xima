

## Plan: Final Dark Mode Pass — Fix All Remaining Inconsistencies

### Root Cause
Glass component CSS classes use hardcoded light-mode values that aren't overridden in dark mode. The `.dark` overrides for `.glass-surface`, `.glass-modal`, etc. are either missing or insufficient. Many page components also lack dark-mode awareness.

### Changes by File

**1. `src/index.css`** — Core dark mode fixes

- Ensure `html.dark body` has `background-color: #08080d` and the radial gradient (already present, verify)
- Add comprehensive `.dark` overrides for all glass classes with `!important`:
  - `.glass-surface`, `.glass-surface-static`, `.glass-card`: bg `rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.08)`, dark shadow
  - `.glass-nav`: bg `rgba(8,8,13,0.82)`, border-bottom `rgba(255,255,255,0.08)`
  - `.glass-modal`: bg `rgba(20,20,30,0.92)`, border `rgba(255,255,255,0.10)`
  - `.glass-input`: bg `rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.10)`, color `#f5f5f7`
  - `.glass-badge`: bg `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.12)`
- Update `.dashboard-hero-gradient` to use `var()` references so it adapts to dark
- Add global catch-all CSS rules at the bottom (Step 9 from user spec): override `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, and gradient `from-*-50` classes in `html.dark`

**2. `src/pages/AssessmentGuide.tsx`** — Fix invisible content in dark mode

The pillar cards use hardcoded `bg-blue-500/10`, `border-blue-500/30` etc. which are fine. The main issues:
- Journey step cards (line 241): `bg-background` is already used — OK
- Pillar cards (line 290): use `${pillar.bgColor}` like `bg-blue-500/10` — these are OK for dark mode (alpha-based)
- Scoring section card (line 322): `bg-gradient-to-br from-muted/30 to-muted/10` — OK
- Progress bar tracks (line 343): `bg-muted` — OK with CSS variables
- The catch-all CSS in Step 9 will handle any remaining hardcoded grays

No file changes needed — the catch-all CSS handles this.

**3. `src/pages/Business.tsx`** — Feature cards and CTA

- Feature cards (line 86): Add dark variant classes to the Card: `dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.08)]`
- Icon color (line 88): uses `text-[hsl(var(--xima-accent))]` — add `dark:text-[rgba(255,255,255,0.60)]`
- CTA card (line 101): already has `dark:bg-primary/5 dark:bg-none` — enhance to `dark:bg-[rgba(99,102,241,0.12)] dark:border-[rgba(99,102,241,0.20)]`

**4. `src/pages/Login.tsx`** — Login card dark mode

- Login card itself uses `<Card>` which inherits from the shadcn card component. The card component should already use `bg-card`. But the logo image may be invisible — add `dark:brightness-200` filter class
- "OPPURE" divider span (line 158): `bg-background` already — OK
- Google auth button — already fixed in prior pass

**5. `src/pages/DevelopmentPlan.tsx`** — Test page dark mode

- Overall Progress card header (line 177): `bg-gradient-to-r from-primary/5 to-primary/10` — fine for both modes
- Stat boxes (lines 202-230): `bg-green-500/10`, `bg-orange-500/10`, `bg-primary/10` — these work in dark mode (alpha-based on transparent)
- Recommendations section header (line 391): same gradient — OK
- Prossimi Passi cards (line 401): already use `bg-card border-border` — OK

No file changes needed.

**6. Settings page components** — All sub-components use `<Card>` which maps to `bg-card`. The Card component uses HSL variables. Need to verify `--card` in dark mode maps correctly.

Currently `.dark { --card: 240 10% 6%; }` = approximately `#0e0e18`. This is very dark and should work. The real issue is that the card component's tailwind class `bg-card` renders via `hsl(var(--card))` which IS dark. So settings cards should be fine IF the Card component is properly using `bg-card`.

Let me check the Card component:

The Card shadcn component uses `bg-card text-card-foreground`. Since `--card: 240 10% 6%` in dark mode, this should render dark. The issue is likely that the glass classes (`glass-surface` etc.) are layered on top with hardcoded light backgrounds.

**Summary of actual file changes needed:**

| File | Changes |
|------|---------|
| `src/index.css` | Add comprehensive `html.dark` glass overrides with `!important`; add global catch-all rules for `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, gradient overrides |
| `src/pages/Business.tsx` | Add dark variant classes to feature cards and CTA |
| `src/pages/Login.tsx` | Add `dark:brightness-200` to logo image |

The global catch-all CSS rules (Step 9) are the most impactful change — they act as a safety net for ALL remaining hardcoded classes across every component, eliminating the need to manually fix each file.

### Approach
- The CSS catch-all rules use `[class*="bg-white"]` attribute selectors to target any element with those Tailwind classes, ensuring dark mode compliance without touching every component file
- Glass component overrides use `!important` to guarantee they take precedence over inline or component-level styles
- This is a 3-file change that covers the entire app

