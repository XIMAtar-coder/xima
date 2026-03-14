

## Plan: Fix Business Section Stuck in Dark Mode

### Root Cause
`src/components/business/BusinessLayout.tsx` has **every single color hardcoded** to dark values (`bg-[#0A0F1C]`, `from-[#0F1419]`, `text-white`, `text-[#A3ABB5]`, `border-[#3A9FFF]/20`). It also renders a permanent `bg-black/50` scrim overlay (line 231). None of these respond to the theme toggle. `Business.tsx` (public landing) already uses `MainLayout` with semantic tokens — it's fine.

### Changes: 1 file

**`src/components/business/BusinessLayout.tsx`** — Full semantic token migration:

| Current hardcoded value | Replace with |
|---|---|
| `bg-[#0A0F1C]` (root wrapper, line 87) | `bg-background` |
| `from-[#0F1419] to-[#0A0F1C]` (sidebar gradient, line 90) | `bg-card` |
| `border-[#3A9FFF]/20` (all borders) | `border-border` |
| `bg-[#3A9FFF]/10` (sidebar icon bg, active nav bg, user info bg) | `bg-primary/10` |
| `border-[#3A9FFF]/30` (active nav border) | `border-primary/30` |
| `text-[#3A9FFF]` (active nav text, icon) | `text-primary` |
| `text-white` (logo, user name, hover states) | `text-foreground` |
| `text-[#A3ABB5]` (inactive nav, footer, user email) | `text-muted-foreground` |
| `hover:text-white` | `hover:text-foreground` |
| `hover:bg-[#3A9FFF]/10` | `hover:bg-primary/10` |
| `bg-[#3A9FFF]` (avatar circle) | `bg-primary` |
| `bg-[#0A0F1C]/80` (header bg, line 185) | `bg-background/80` |
| `border-[#3A9FFF]/10` (header border, footer border) | `border-border` |
| `bg-[#0F1419] border-[#3A9FFF]/20` (dropdown, line 213) | `bg-popover border-border` |
| `hover:text-[#3A9FFF]` (footer links) | `hover:text-primary` |

- **Remove the dark scrim overlay entirely** (line 231: `<div className="fixed inset-0 bg-black/50 ...">`) — this dims the entire content area permanently and serves no purpose with proper theming.

- Keep `ThemeToggle` import and rendering (already present, line 187).

### Result
- Light mode: sidebar and content use light card/background colors, primary accent for active items
- Dark mode: sidebar and content use dark card/background colors via CSS variables
- Theme toggle switches both modes correctly
- Zero hardcoded color values remain

