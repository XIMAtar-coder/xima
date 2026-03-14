

## Plan: Fully Responsive Design Across XIMA App

### Scope
Create a `useDeviceType` hook, a mobile bottom tab bar, refactor the navbar for tablet/mobile, add responsive typography/spacing/grid utilities, and apply responsive classes across all key pages and components.

### Files to Create
1. **`src/hooks/useDeviceType.ts`** — Hook returning `'mobile' | 'tablet' | 'desktop'` based on window width with 100ms debounced resize listener. Breakpoints: mobile <768, tablet 768-1279, desktop 1280+.

2. **`src/components/layout/MobileTabBar.tsx`** — Fixed bottom tab bar for authenticated mobile users. 5 tabs (Dashboard/Home, Feed/MessageCircle, Test/BookOpen, Impostazioni/Settings, Help/HelpCircle). Glass material with safe-area-inset-bottom. Hidden above `md` breakpoint. Uses `useUser` for auth check and `useLocation` for active state.

### Files to Edit

3. **`src/index.css`** — Add:
   - `overflow-x: hidden` on `body`
   - `@media (hover: none)` rule to replace hover effects with `active:scale-[0.97]`
   - Responsive utility classes for touch targets (`.touch-target { min-height: 44px }`)
   - Mobile bottom bar safe area: `padding-bottom: env(safe-area-inset-bottom)`

4. **`src/components/layout/MainLayout.tsx`** — Major changes:
   - Import and render `<MobileTabBar />` after `<Footer />` when authenticated
   - Add `pb-20 md:pb-0` to main content when authenticated (space for bottom bar)
   - Navbar tablet mode: compress spacing, reduce font to `text-[14px]` at `md` breakpoint
   - Mobile navbar: show only logo + notification bell (if logged in) + hamburger
   - Mobile drawer: increase tap targets to `min-h-[48px]`, glass background with `backdrop-blur-[40px]`
   - Hide desktop nav items at `<md` (already `hidden md:flex`), adjust `lg` to `xl` for logged-in items to give tablet more room

5. **`src/pages/Profile.tsx`** (Dashboard) — Apply responsive grid:
   - Container: `px-4 md:px-8` instead of default container padding
   - Two-column grid: `grid-cols-1 lg:grid-cols-2` (already done, verify gap)
   - Title: `text-[28px] md:text-[34px]` (already done)

6. **`src/pages/DevelopmentPlan.tsx`** — Apply responsive spacing:
   - Container: `max-w-[800px] mx-auto px-4 md:px-8`
   - Card padding: `p-4 md:p-5 xl:p-6`
   - Section gaps: `gap-3 md:gap-4`
   - Progress bar sections and "Prossimi Passi" cards: full width stacking on mobile

7. **`src/pages/Business.tsx`** — Feature grid already has `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. Add responsive padding `px-4 md:px-8 xl:px-12` and typography scaling on hero title.

8. **`src/components/how-it-works/XimaPillars.tsx`** — Already `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Add responsive card padding.

9. **`src/pages/HowItWorks.tsx`** — Add responsive container padding and typography scaling.

10. **`src/components/profile/XimatarHeroCard.tsx`** — Mobile: vertical stacking (avatar above content), avatar `w-16 h-16 md:w-20 md:h-20 xl:w-24 xl:h-24`.

11. **`src/components/profile/CVAnalysisCard.tsx`** — Mobile: single column for pillar rows, ensure progress bar is full width.

12. **`src/components/opportunities/MyOpportunitiesSection.tsx`** — Tabs: `min-h-[44px]` on mobile, stretch full width.

13. **`src/components/profile/PillarRadarChart.tsx`** — Responsive chart container: `max-w-[300px] md:max-w-[360px] xl:max-w-[400px]` with `w-full`.

14. **`src/pages/Settings.tsx`** — Container responsive padding `px-4 md:px-8`.

15. **`src/pages/Login.tsx`** — Input fields `min-h-[48px]` on mobile.

16. **`src/pages/AssessmentGuide.tsx`** — Responsive typography and padding.

17. **`src/components/layout/Footer.tsx`** — Already responsive. Add `pb-20 md:pb-0` awareness for mobile tab bar.

18. **`tailwind.config.ts`** — Breakpoints are already standard Tailwind defaults (sm:640, md:768, lg:1024, xl:1280, 2xl:1536). No changes needed.

### Key Patterns Applied Everywhere
- **Typography**: `text-[28px] md:text-[34px] xl:text-[40px]` for hero titles, `text-[14px] md:text-[15px] xl:text-[17px]` for body
- **Spacing**: `px-4 md:px-8 xl:px-12` for sections, `p-4 md:p-5 xl:p-6` for cards, `gap-3 md:gap-4` between cards
- **Touch targets**: `min-h-[44px]` on buttons, `min-h-[48px]` on inputs and nav items on mobile
- **Overflow**: `overflow-x-hidden` on body, `line-clamp-2` on long text on mobile
- **Images**: `w-16 h-16 md:w-20 md:h-20 xl:w-24 xl:h-24` for avatars, `object-cover` always

### Estimated: ~16 files, 2 new + 14 edited

