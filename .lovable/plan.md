

## Plan: Fix Dark Mode Consistency Across the Entire App

### Problem
Many components use hardcoded Tailwind color classes (`bg-white`, `text-gray-600`, `border-gray-200`, etc.) that don't respond to the `.dark` class. The CSS variable system is correctly set up but underutilized.

### STEP 1 — Add CSS variable-based utility classes and update glass components in `src/index.css`

Add these CSS custom properties to `:root` and `.dark`:
- `--glass-card-bg`, `--card-bg`, `--surface-bg` (already partially there, formalize)

Update glass component classes (`.glass-surface`, `.glass-nav`, `.glass-modal`, `.glass-input`, `.glass-badge`) to use `var()` references instead of hardcoded values where missing. Add dark scrollbar styles.

### STEP 2 — Fix hardcoded colors in page-level components

**Files with `text-gray-*` / `bg-gray-*` / `border-gray-*` needing dark variants:**

| File | Changes |
|------|---------|
| `src/pages/NotFound.tsx` | `bg-gray-100` → `bg-background`, `text-gray-600` → `text-muted-foreground`, `text-blue-500` → `text-primary` |
| `src/pages/Onboarding.tsx` | Replace all `text-gray-*`, `bg-gray-200` with semantic classes (`text-muted-foreground`, `bg-muted`, etc.) |
| `src/pages/Login.tsx` (line 158) | `bg-white` → `bg-background` for the "or" divider span |
| `src/pages/Business.tsx` | CTA card: add `dark:bg-[rgba(99,102,241,0.15)] dark:border-[rgba(99,102,241,0.25)]`; feature cards already use `text-foreground`/`text-muted-foreground` — just ensure card bg adapts |
| `src/components/LanguageSwitcher.tsx` | `text-gray-700` → `text-muted-foreground`, `bg-blue-50` → `bg-primary/10` |
| `src/components/CvUploader.tsx` | Replace all `bg-white`, `text-gray-*`, `border-gray-*` with semantic equivalents + dark variants |
| `src/components/XimaScoreCard.tsx` | `text-gray-400` → `text-muted-foreground`, `bg-gray-200` → `bg-muted`, `text-gray-600` → `text-muted-foreground` |
| `src/components/XimaAvatar.tsx` | All `text-gray-*` → semantic |
| `src/components/auth/GoogleAuthButton.tsx` | `bg-white hover:bg-gray-100` → `bg-background hover:bg-muted`, `text-gray-800` → `text-foreground`, `border-gray-300` → `border-border` |
| `src/components/how-it-works/CallToAction.tsx` | Remove `from-blue-50 to-purple-50`, add `glass-surface-static` + dark variant, `text-gray-600` → `text-muted-foreground` |
| `src/components/how-it-works/AvatarExplanation.tsx` | `text-gray-600` → `text-muted-foreground` |
| `src/components/ximatar-journey/BaselineAssessment.tsx` | `bg-gray-50 border-gray-200` → `bg-muted border-border` |
| `src/components/ximatar-journey/MentorBooking.tsx` | `bg-gray-50 border-gray-200` → `bg-muted border-border`, `text-gray-400` → `text-muted-foreground`, `bg-blue-50` → `bg-primary/10` |

### STEP 3 — Fix specific broken dashboard sections

**`src/components/opportunities/MyOpportunitiesSection.tsx`**: The tab bar and opportunity cards use `hsl(var(--xima-accent))` which may not have dark variants. Add dark overrides to any hardcoded `bg-gradient-to-br from-background` patterns.

**`src/components/profile/CVAnalysisCard.tsx`**: Progress bar tracks need `dark:bg-[rgba(255,255,255,0.10)]`. Score labels need dark text variants.

### STEP 4 — Verify no `#4171d6` legacy accent remains

Multiple files still reference the old `#4171d6` blue (LanguageSwitcher, CvUploader, XimaScoreCard, CallToAction, etc.). Replace with `text-primary` / `bg-primary` which maps to `#007AFF` (light) / `#6366f1` (dark) via CSS variables.

### Files to edit (18 files total)
1. `src/index.css` — dark scrollbar, finalize CSS variable usage in glass classes
2. `src/pages/NotFound.tsx`
3. `src/pages/Onboarding.tsx`
4. `src/pages/Login.tsx`
5. `src/pages/Business.tsx`
6. `src/components/LanguageSwitcher.tsx`
7. `src/components/CvUploader.tsx`
8. `src/components/XimaScoreCard.tsx`
9. `src/components/XimaAvatar.tsx`
10. `src/components/auth/GoogleAuthButton.tsx`
11. `src/components/how-it-works/CallToAction.tsx`
12. `src/components/how-it-works/AvatarExplanation.tsx`
13. `src/components/ximatar-journey/BaselineAssessment.tsx`
14. `src/components/ximatar-journey/MentorBooking.tsx`
15. `src/components/opportunities/MyOpportunitiesSection.tsx`
16. `src/components/profile/CVAnalysisCard.tsx`
17. `src/pages/DevelopmentPlan.tsx` (verify existing dark fixes are complete)
18. `src/components/how-it-works/XimaPillars.tsx` (pillar card backgrounds)

### Approach
All replacements follow one principle: replace hardcoded Tailwind color classes with either:
- Semantic Tailwind classes that auto-adapt (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `border-border`)
- Explicit `dark:` variants where semantic classes don't exist
- CSS variable references (`var(--text-primary)`, `var(--glass-bg)`) in custom CSS

No new dependencies. No structural changes. Pure color/theme fixes.

