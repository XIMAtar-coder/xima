
Goal: perform a true final dark-mode pass by fixing the theme foundation + shared UI primitives (current root cause), then applying page-specific surgical fixes from your 10 steps.

1) Core dark theme layer (`src/index.css`)
- Enforce exact dark root body:
  - `html.dark body { background-color:#08080d; background-image: radial-gradient(ellipse at center, #0d0d1a 0%, #08080d 100%); color:#f5f5f7; }`
- Add `color-scheme: dark` inside `.dark` (keep `html.dark` too).
- Keep/verify `.dark` HSL tokens:
  - `--background: 240 10% 4%` (critical for all `bg-background` containers)
  - card/popover/muted/border/input values aligned to dark palette.
- Replace dark glass overrides with the exact required block:
  - `.glass-surface/.glass-card/.glass-surface-static`, `.glass-nav`, `.glass-modal`, `.glass-input`, `.glass-badge` using your rgba values + `!important`.
- Keep dark scrollbar rules.
- Add Step-9 safety-net block at file bottom exactly (bg/text/border/gradient class-pattern overrides).

2) Fix actual bleed source: shared UI primitives (currently hardcoded light glass)
- `src/components/ui/card.tsx`: remove hardcoded light rgba glass values; make base class dark-aware (semantic + dark-safe glass), so all cards stop rendering light in dark mode.
- `src/components/ui/button.tsx`: update `outline/secondary/ghost` to avoid light translucent white surfaces in dark mode.
- `src/components/ui/input.tsx`: enforce dark input background/border/text/placeholder behavior.
- `src/components/ui/tabs.tsx`: fix tab list + active trigger so active tabs are not white in dark mode.
- `src/components/ui/separator.tsx`: use semantic border color (not hardcoded light divider).
- `src/components/ui/switch.tsx` (track), `badge.tsx` (secondary/outline), `progress.tsx` (track) to align with dark rgba spec.

3) Settings page and its sections (full pass)
Files:
- `src/pages/Settings.tsx`
- `src/components/settings/MembershipSection.tsx`
- `src/components/profile/DataExportButton.tsx`
- `src/components/settings/ProfilingOptOutSection.tsx`
- `src/components/settings/AccountDeletionSection.tsx`
- `src/components/settings/MentorCVConsentToggle.tsx`
Changes:
- Apply dark glass card treatments to each section exactly as specified.
- Invite link/input dark styling.
- Referral stat boxes dark backgrounds/text.
- Upgrade row dark card styling + text hierarchy.
- Data export bullet text dark opacity.
- Profiling toggle-track dark tone.
- Account deletion red-tinted dark panel + warning text opacity.
- Mentor CV access card dark background/border/text.

4) Dashboard remaining issues
Files:
- `src/components/opportunities/MyOpportunitiesSection.tsx`
- `src/components/profile/MentorSection.tsx`
- `src/components/profile/CVAnalysisCard.tsx`
- `src/components/profile/AssessmentOverviewCard.tsx`
- (if needed) `src/components/profile/MembershipSummaryCard.tsx`
Changes:
- Opportunities tabs: dark container/active/inactive states.
- Mentor card descriptions + availability panel dark readability.
- CV rows + labels + progress tracks dark rgba values.
- Stats mini-card visual hierarchy (number vs label) in dark.
- Remove any residual light gradient/card backgrounds in these sections.

5) Piano di Sviluppo dark pass
File: `src/pages/DevelopmentPlan.tsx`
- Progresso Generale container + inner stat boxes dark rgba.
- Test cards dark bg/border + title/desc/metadata text opacity.
- Prossimi Passi container and inner cards dark hierarchy.
- Progress track dark rgba.

6) Guida / Assessment Guide invisibility fix
File: `src/pages/AssessmentGuide.tsx`
- Step cards, badges, titles, descriptions, connector lines: explicit dark classes.
- Ensure all below-step sections have readable dark text tokens (no dark-on-dark).
- Remove/neutralize any light gradients that collapse readability in dark mode.

7) Business + Login page fixes
Files:
- `src/pages/Business.tsx`
- `src/pages/Login.tsx`
- `src/components/auth/GoogleAuthButton.tsx`
Changes:
- Business feature cards + CTA section exact dark rgba/border/text/icon values.
- Login card dark glass surface, OPPURE divider dark bg/text, Google button dark states, input dark states.
- Ensure logo visibility (`dark:brightness-200`/`dark:invert` if needed).

8) Business-side theme toggle gap (missing control)
File: `src/components/business/BusinessLayout.tsx`
- Add `<ThemeToggle />` in business top header (alongside language/guide controls), so theme switching exists in business portal too.
- Keep placement consistent with main app nav behavior.

9) Verification pass (mandatory)
- Verify dark mode on:
  - Dashboard (`/profile` or `/dashboard`)
  - Settings (`/settings`)
  - Piano di Sviluppo (`/development-plan`)
  - Come Funziona (`/how-it-works`)
  - Guida (`/assessment-guide`)
  - Business (`/business`)
  - Login (`/login`)
  - Chi Siamo (`/about`)
- Acceptance criteria:
  - no light cards/surfaces bleeding through
  - no invisible text
  - no white active tabs in dark mode
  - business side has a visible theme toggle
  - `bg-background` areas resolve to #08080d in dark.
