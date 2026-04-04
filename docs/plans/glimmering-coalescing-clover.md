# Design System Overhaul — Premium, Unified UI/UX

## Context

SecondStream is a waste/water treatment AI platform used by **field agents** (mobile-first, on-site visits) and **admins** (desktop dashboards, data-heavy). The current UI has:
- **138+ CSS variables** with a complex MD3 surface hierarchy that most pages ignore
- **3 different table systems**, 3 dialog tiers, 6+ micro-typography patterns
- Visual split: admin pages use shadcn tokens (`bg-card`, `bg-muted`), agent pages use MD3 tokens (`bg-surface-container-lowest`)
- Duplicate components across `ui/`, `patterns/`, `system/` (deprecated but still imported)
- Hardcoded colors (`hsl()` wrapping OKLCH values = bugs, `text-teal-800`, `bg-white`)
- Font mismatch: DM Sans declared in CSS but never loaded (Manrope loads instead)
- The overall feel is "sobrio, blanco y negro" — too subdued for a modern SaaS platform

**Goal**: Unified, premium design system. Every page looks like it belongs to the same product. Clean, modern, intuitive. Good contrast. Reusable components. Feels like a 2026 product.

---

## Phase 1: Color Palette & Theme Tokens (globals.css)

### Problem
- Too many tokens (138+), most unused or redundant
- MD3 surface hierarchy (`surface-container-lowest` through `highest`) adds complexity without value — shadcn pages don't use it
- Teal primary is good for the water/waste sector but needs more vibrancy
- No accent color creates monotony (everything is teal or grey)
- Badge colors have poor contrast on light backgrounds

### Changes

**1.1 Remove MD3 surface hierarchy entirely** — delete all `surface-container-*` tokens. Migration map:
```
bg-surface-container-lowest  → bg-card
bg-surface-container-low     → bg-muted/50  or  bg-card
bg-surface-container         → bg-muted
bg-surface-container-high    → bg-muted
bg-surface-container-highest → bg-accent
bg-surface                   → bg-background
bg-surface-dim               → bg-muted
bg-surface-bright            → bg-card
bg-surface-elevated          → bg-popover
bg-surface-tint              → (delete, unused pattern)
bg-error-container           → bg-destructive/10
text-on-error-container      → text-destructive
text-secondary (MD3)         → text-muted-foreground
```
Remove from globals.css `:root`, `.dark`, and `@theme inline`. Update ALL component usages.

**1.2 Introduce a warm accent color** — add a secondary accent (amber/gold) to complement teal:
```
--accent: oklch(0.78 0.14 75)          /* warm amber */
--accent-foreground: oklch(0.25 0.05 75)
```
This creates visual energy. Teal + amber is a classic complementary pair with strong contrast. Used for: highlights, CTAs that need to stand out from primary, notification dots, "new" badges.

**1.3 Increase primary vibrancy** — current teal `oklch(0.55 0.14 175)` is too muted. Shift to:
```
--primary: oklch(0.60 0.16 175)        /* brighter, more saturated teal */
--primary-foreground: oklch(0.99 0 0)  /* white */
```

**1.4 Fix badge contrast** — ensure all badge variants have WCAG AA contrast (4.5:1 minimum):
- Success: darker green text on lighter green bg
- Warning: darker amber text on lighter amber bg  
- Destructive: ensure red text on red-tinted bg has sufficient contrast
- Add `--badge-*` tokens with tested contrast ratios

**1.5 Remove dead tokens** — audit and delete: treatment-stage colors (if unused), password-strength (if unused), avatar palette (if fewer than 8 needed), duplicate scrollbar styles, all `hsl()` references.

**1.6 Fix font stack** — either load DM Sans or remove it from `--font-display`. Currently Manrope is what actually renders. Decision: keep Manrope (it's modern, geometric, works well) and clean up the CSS fallback.

### Files
- `frontend/app/globals.css` — rewrite `:root` and `.dark` blocks
- `frontend/app/layout.tsx` — verify font imports match CSS

---

## Phase 2: Component Consolidation

### Problem
- `EmptyState` exists in both `ui/` and `patterns/` with different APIs
- `LoadingButton` exists in both `ui/` and `patterns/`
- `DataTable` exists in `ui/`, `patterns/`, and `system/` (3 versions!)
- `ConfirmArchiveDialog`, `ConfirmRestoreDialog`, `ConfirmPurgeDialog` exist in both `ui/` and `patterns/`
- `system/` is deprecated but files still have standalone implementations

### Changes

**2.1 Delete `components/system/` entirely** — it's deprecated, patterns/ already has everything. Update any remaining imports.

**2.2 Establish single source of truth per component:**

| Component | Keep | Delete |
|-----------|------|--------|
| EmptyState | `patterns/feedback/empty-state.tsx` | `ui/empty-state.tsx` |
| LoadingButton | `patterns/feedback/loading-button.tsx` | `ui/loading-button.tsx` |
| DataTable | `patterns/tables/data-table.tsx` | `ui/data-table.tsx`, `system/data-table.tsx` |
| ConfirmArchive/Restore/Purge | `patterns/dialogs/confirm-*.tsx` | `ui/confirm-*.tsx` |

**2.3 Update barrel exports** (`ui/index.ts`, `patterns/index.ts`) to reflect single sources.

### Files
- `frontend/components/system/` — delete directory
- `frontend/components/ui/index.ts` — remove duplicate exports
- `frontend/components/ui/empty-state.tsx` — delete
- `frontend/components/ui/loading-button.tsx` — delete (if patterns version exists)
- `frontend/components/ui/data-table.tsx` — delete
- `frontend/components/ui/confirm-archive-dialog.tsx` — delete
- `frontend/components/ui/confirm-restore-dialog.tsx` — delete
- `frontend/components/ui/confirm-purge-dialog.tsx` — delete
- All importers of deleted components — update imports

---

## Phase 3: Standardize Shared Patterns

### Problem
- Pages use wildly different approaches for the same UI needs
- No single table approach, dialog style, filter pattern, or pagination

### Changes

**3.1 Single table system** — standardize on TanStack React Table + shadcn `Table` primitives (what users page does). The `patterns/tables/data-table.tsx` becomes the ONE reusable table with:
- Built-in sorting, filtering, pagination
- Consistent header typography: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
- Alternating row support via data attribute, not inline classes
- Built-in empty state integration

**3.2 Single dialog tier** — standardize all dialogs:
- Simple forms (create location): default `DialogContent` with `sm:max-w-[500px]`
- Complex forms (add/edit client): `DialogContent` with `sm:max-w-[780px] p-0` + sectioned layout
- Both use `rounded-xl` (not mixing rounded-lg/rounded-2xl)
- All use `bg-card` (not `bg-surface-container-lowest`)

**3.3 Single pagination** — all tables use `TablePagination` from patterns. Delete custom pagination implementations.

**3.4 Single filter approach** — all filterable pages use `FilterBar` from patterns. Custom filter rows migrate to FilterBar.

**3.5 Single micro-typography scale for labels:**
```css
.label-overline {
  @apply text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground;
}
```
Use this ONE class everywhere: KPI titles, table headers, section labels, form section headings.

**3.6 All pages use PageShell** — agent dashboard and locations page must wrap in `PageShell` like admin pages do.

### Files
- `frontend/components/patterns/tables/data-table.tsx` — enhance as single table
- `frontend/components/patterns/layout/page-header.tsx` — verify consistency
- All page files that use custom tables/dialogs/pagination/filters

---

## Phase 4: Fix Color Bugs & Hardcoded Values

### Problem
- `hsl(var(--primary))` wrapping OKLCH values = broken colors
- `text-teal-800`, `bg-white` = hardcoded outside design system
- `rgba()` values in globals.css

### Changes

**4.1 Fix all `hsl()` wrapping OKLCH:**
- `ui/circular-gauge.tsx` → use `var(--color-primary)` or Tailwind classes
- `system/data-table.tsx` → delete (Phase 2)
- `shared/branding/secondstream-logo.tsx` → use `var(--color-logo-primary)` directly
- `features/auth/auth-layout.tsx` → use `bg-primary` / opacity utilities
- `features/auth/background-effects.tsx` → use CSS variables directly
- `features/proposals/resource-considerations-card.tsx` → use `text-success`

**4.2 Replace hardcoded Tailwind colors:**
- `field-agent-offer-pipeline-section.tsx`: `text-teal-800` → `text-primary-foreground` or `text-primary`
- `field-agent-offer-pipeline-section.tsx`: `bg-white` → `bg-card` or `bg-surface`

**4.3 Replace `rgba()` in globals.css with OKLCH equivalents.**

### Files
- Listed above per component

---

## Phase 5: Premium Visual Polish

### Problem
- Design feels flat, overly minimal ("blanco y negro")
- No visual hierarchy between sections
- Cards all look the same — no elevation system
- No subtle textures or depth

### Changes

**5.1 Elevation system** — 3 tiers of card elevation:
```css
.card-flat    { @apply border bg-card; }
.card-raised  { @apply border bg-card shadow-sm; }
.card-floating { @apply border-0 bg-card shadow-md; }
```

**5.2 Subtle gradient backgrounds** for hero sections and page headers:
```css
.bg-page-gradient {
  background: linear-gradient(
    180deg,
    oklch(0.97 0.015 175 / 0.5) 0%,   /* very subtle teal tint */
    oklch(0.975 0.008 195) 100%        /* background color */
  );
}
```

**5.3 Interactive feedback** — ensure all clickable cards have hover states:
- Subtle border color shift on hover
- Micro shadow increase
- 150ms transition (already defined as `--transition-duration`)

**5.4 Dashboard hero redesign** — the field agent dashboard hero should feel premium:
- Teal gradient background (not flat surface)
- Glassmorphism card overlays where appropriate
- Animated number counters (already have `AnimatedNumber`)

**5.5 Badge refinement** — subtle badges with better contrast:
- Slightly more saturated background tints
- Darker text for readability
- Consistent `rounded-md` (not mixing full/md/lg)

**5.6 Dark mode polish** — verify all new patterns work in dark mode with sufficient contrast.

### Files
- `frontend/app/globals.css` — add utility classes
- Dashboard components — apply polish
- `frontend/components/ui/badge.tsx` — refine variants
- `frontend/components/ui/card.tsx` — add elevation variants

---

## Phase 6: Border Radius Standardization

### Problem
- Mixing `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`, `rounded-[1.25rem]`
- No consistent radius scale

### Changes

Establish and enforce:
```
Cards/containers: rounded-xl (0.75rem)
Buttons/inputs:   rounded-lg (0.5rem)  — already the shadcn default
Badges/chips:     rounded-md (0.375rem)
Avatars/pills:    rounded-full
```

Remove all arbitrary radius values (`rounded-[2rem]`, `rounded-[1.25rem]`, `rounded-3xl`).

### Files
- All dashboard components with custom radius
- Dialog overrides
- Badge overrides

---

## Execution Order

1. **Phase 1** (tokens) — foundation, everything depends on this
2. **Phase 4** (bug fixes) — fix broken colors before changing components
3. **Phase 2** (consolidation) — delete duplicates before modifying
4. **Phase 6** (radius) — quick, mechanical
5. **Phase 3** (standardize patterns) — requires consolidated components
6. **Phase 5** (polish) — final visual refinement

---

## Verification

1. `cd frontend && bun run check:ci` — type checking, lint
2. Visual check of all pages in browser:
   - Admin: feedback, organizations, users, proposal-ratings
   - Agent: dashboard, clients, locations, streams
3. Verify dark mode on all pages
4. Check badge contrast ratios (Chrome DevTools → Accessibility)
5. Mobile responsive check for agent pages

---

## Decisions (Confirmed)

- **Icons**: Lucide — already in use, native shadcn support
- **Display font**: Manrope — already loaded, modern geometric. Remove DM Sans from CSS fallback.
- **MD3 tokens**: Migrate ALL to shadcn standard (`bg-card`, `bg-muted`, `bg-background`). No MD3 surface hierarchy.
- **Preset**: Keep radix-luma + custom teal. Refine colors, add accent, increase vibrancy.
