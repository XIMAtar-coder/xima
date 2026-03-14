

## Plan: Dark/Light Mode Toggle + Navbar Restructure + Card Fixes

### STEP 1 — Dark/Light Mode Toggle

**Current state:** `next-themes` is already installed and `ThemeProvider` wraps the app in `App.tsx` with `attribute="class"`. The existing `ThemeToggle.tsx` uses `next-themes` but has a basic button style.

**Changes:**

1. **`src/index.css`** — Add a `.dark` variant block inside `@layer base` with all dark-mode CSS variables:
   - `--background: 240 10% 4%` (#08080d)
   - `--foreground: 240 5% 96%` (#f5f5f7)
   - Glass tokens: `--glass-bg: rgba(255,255,255,0.06)`, blur 24px, border `rgba(255,255,255,0.10)`
   - Text: `--text-primary: #f5f5f7`, `--text-secondary: rgba(255,255,255,0.55)`
   - Dividers, scrollbar, nav background all adapted for dark
   - `html.dark { color-scheme: dark; }` and `html.dark body` background gradient from `#0d0d1a` to `#08080d`
   - Dark `.glass-nav`, `.glass-input`, `.glass-badge` overrides

2. **`src/components/ThemeToggle.tsx`** — Rewrite as a glass pill toggle button (border-radius 999px, padding 6px 10px, glass material background, Sun/Moon icon with 200ms crossfade transition). Keep using `useTheme` from `next-themes`.

3. **`src/App.tsx`** — Change `ThemeProvider` `defaultTheme` from `"system"` to `"light"` and ensure `storageKey` is set for localStorage persistence.

### STEP 2 — Fix "Prossimi Passi" Cards

**Location:** `src/pages/DevelopmentPlan.tsx` lines 390-450

The three recommendation cards use colored gradient backgrounds (`from-blue-50`, `from-green-50`, `from-purple-50`) with colored text that becomes unreadable. Fix:

- **Light mode:** White background (`bg-white`), border `rgba(60,60,67,0.12)`, title `text-[#1c1c1e] font-semibold`, body `text-[#6e6e73]`, icon `text-[#007AFF]`
- **Dark mode (via dark: prefix):** `dark:bg-[rgba(255,255,255,0.08)]`, `dark:border-[rgba(255,255,255,0.10)]`, title `dark:text-[#f5f5f7]`, body `dark:text-[rgba(255,255,255,0.60)]`, icon `dark:text-[#6366f1]`
- Card container: `rounded-[16px] p-5`, remove all gradient backgrounds
- Section header card: apply glass-surface-static treatment

### STEP 3 — Navbar for Logged-OUT Users

**File:** `src/components/layout/MainLayout.tsx`

Restructure the public nav (lines 125-155) so logged-out users see:
- **Left:** XIMA logo
- **Center/Right links:** "Come Funziona" (`/how-it-works`), "Guida" (`/assessment-guide`), "Chi Siamo" (`/about`), "Business" (`/business`)
- **Right controls:** Language switcher | Theme toggle (new `<ThemeToggle />`) | Login button (primary style, `#007AFF`, rounded-[14px], `px-5 py-2.5`)
- Remove the separate "For Business" button that currently shows next to Login

### STEP 4 — Navbar for Logged-IN Users

Restructure the authenticated nav (lines 243-315):
- **Left:** XIMA logo (no public nav links)
- **Right:** Language switcher | Notification bell | Theme toggle | "Dashboard" (`/profile`) | "Feed" (`/chat`) | "Test" (`/development-plan`) | "Impostazioni" (`/settings`) | "Help" (opens guide modal — replaces "Guida" label) | Credits badge (score) | "Esci" (logout)
- Remove "Come Funziona", "Chi Siamo", "Business" from authenticated navbar
- Conditionally hide public nav links when `isAuthenticated` is true (currently they always show)
- Active item: `text-[#007AFF] font-semibold`

### STEP 5 — Mobile Menu & Cleanup

- Update the mobile `Sheet` menu to match the same logged-in vs logged-out item structure
- Add `<ThemeToggle />` to mobile menu
- Ensure dark/light mode CSS covers all existing utility classes and component variants (glass-surface, glass-nav, glass-modal, glass-input, glass-badge, etc.)
- Verify `border-color` base rule adapts to dark mode

### Files to Edit
- `src/index.css` — dark mode CSS variables and overrides
- `src/components/ThemeToggle.tsx` — glass pill toggle
- `src/App.tsx` — ThemeProvider config tweak
- `src/components/layout/MainLayout.tsx` — navbar restructure (logged-in vs logged-out)
- `src/pages/DevelopmentPlan.tsx` — fix Prossimi Passi cards

