# SecondStream Design System Overhaul

## Context

The platform has severe **design system drift**: 3 table implementations, 4 filter patterns, 3 KPI card APIs, inconsistent badges, 5+ border-radius values, mixed form libraries, and no standard page layout enforcement. The color palette (teal OKLCH) is technically sound but reads flat/sober — too monochromatic and lacking the warmth expected in a sustainability/circular-economy B2B SaaS. Every page feels different. The goal: a premium, modern, cohesive design system that feels 2026-clean across admin and field-agent surfaces.

---

## Phase 0: Color Palette & Token Evolution

### 0A. Warmer, More Vibrant Primary

Current teal (`oklch(0.6 0.16 175)`) is cold and clinical. Shift slightly warmer with more chroma:

```css
--primary: oklch(0.58 0.17 172);           /* warmer teal, +chroma */
--primary-foreground: oklch(0.99 0.003 172);
--primary-container: oklch(0.42 0.14 172); /* deeper for hover/pressed */
--primary-fixed: oklch(0.86 0.09 172);
--primary-fixed-dim: oklch(0.74 0.12 172);
```

### 0B. Promote Warm Accent (Amber/Gold)

Existing `--amber` is underused. Elevate to first-class warm accent for CTAs, highlights, premium touches:

```css
--accent-warm: oklch(0.78 0.15 75);
--accent-warm-foreground: oklch(0.2 0.06 72);
--accent-warm-container: oklch(0.9 0.08 75);
--accent-warm-subtle: oklch(0.95 0.04 75);
```

### 0C. Surface Hierarchy — More Chromatic

Bump chroma +0.003-0.005 across surface stack to feel less grey:

```css
--surface-container-lowest: oklch(0.99 0.006 190);
--surface-container-low: oklch(0.965 0.011 192);
--surface-container: oklch(0.945 0.015 195);
--surface-container-high: oklch(0.915 0.018 200);
--surface-container-highest: oklch(0.87 0.022 205);
```

### 0D. Premium Gradient Tokens

```css
--gradient-hero: linear-gradient(135deg, oklch(0.44 0.14 172), oklch(0.52 0.12 200), oklch(0.58 0.17 172));
--gradient-warm: linear-gradient(135deg, oklch(0.58 0.17 172), oklch(0.7 0.14 120));
--gradient-surface: linear-gradient(180deg, oklch(0.975 0.01 190), oklch(0.965 0.006 210));
--gradient-glass: linear-gradient(135deg, oklch(1 0 0 / 0.12), oklch(1 0 0 / 0.04));
```

### 0E. Multi-Hue Chart Colors (replace monochromatic teal ramp)

```css
--chart-1: oklch(0.55 0.16 172);  /* primary teal */
--chart-2: oklch(0.62 0.14 145);  /* green-teal */
--chart-3: oklch(0.72 0.15 75);   /* amber accent */
--chart-4: oklch(0.58 0.12 240);  /* slate blue */
--chart-5: oklch(0.65 0.10 320);  /* mauve */
```

### 0F. Add Badge Borders for Contrast

All `-subtle` badge variants currently have `border-transparent` — on white cards they disappear. Add semantic borders:

```css
--badge-success-border: color-mix(in oklch, var(--success) 28%, transparent);
--badge-warning-border: color-mix(in oklch, var(--warning) 28%, transparent);
--badge-destructive-border: color-mix(in oklch, var(--destructive) 28%, transparent);
--badge-primary-border: color-mix(in oklch, var(--primary) 28%, transparent);
--badge-neutral-border: color-mix(in oklch, var(--outline-variant) 40%, transparent);
```

Update badge.tsx `-subtle` variants: `border-transparent` → `border-badge-*-border`

### 0G. Standardize Border Radius

Kill all arbitrary values. Define tokens:

| Context | Class | Replaces |
|---------|-------|----------|
| Cards, panels | `rounded-xl` | `rounded-[1.25rem]`, `rounded-[1rem]` |
| Hero sections, dashboard cards | `rounded-2xl` | `rounded-[2rem]`, `rounded-3xl` |
| Buttons, inputs | `rounded-md` | various |
| Badges | `rounded-full` | `rounded-md` on badges |

Search-and-replace: `rounded-[2rem]` → `rounded-2xl`, `rounded-[1.25rem]` → `rounded-xl`, `rounded-[1rem]` → `rounded-lg`

### 0H. Fix Token Inconsistencies

- Map `--primary-fixed` and `--primary-fixed-dim` in `@theme inline`
- Define `--inverse-surface` and `--inverse-on-surface` in `:root` (currently dark-only)
- Remove `--focus-ring` from color namespace (it's a box-shadow value, not a color)

**Files:** `frontend/app/globals.css`

---

## Phase 1: Component Standardization (ONE of each)

### 1A. Tables → TanStack React Table via `patterns/tables/data-table.tsx`

Enhance the pattern DataTable with:
- Server-side pagination callback support
- Column visibility toggle
- Expandable rows (needed by Feedback, Dashboard)
- Toolbar slot for FilterBar integration
- Sticky header, hover row tint `hover:bg-primary/3`
- Alternating row option (opt-in)

Delete `ui/data-table.tsx` after migration. Migrate all manual `<Table>` usages.

### 1B. Pagination → Built into DataTable + standalone `Pagination` for non-table

Remove hand-rolled prev/next buttons (Proposal Ratings).

### 1C. Filtering → `patterns/inputs/filter-bar.tsx` everywhere

Extract inline selects from Feedback. Replace Popover filters from Proposal Ratings. Add FilterBar when dataset > ~20 items.

### 1D. KPI Cards → Simplify API

Current KpiCard has 15 props with dual naming (`title`/`label`, `subtitle`/`subValue`, `change`/`trend`). Consolidate:

- Remove `label` → use `title` only
- Remove `subValue` → use `subtitle` only
- Merge `trend` into `change` (normalize `{ value, type }`)
- Remove `isPrimary` → use `variant="accent"`
- Remove `badge`/`badgeType` → compose externally with `<Badge>` when needed
- Remove `hasAction` → compose with parent click handler
- Result: ~7 props (`title`, `value`, `subtitle`, `change`, `icon`, `variant`, `loading`)

### 1E. Badges → Semantic variants ONLY, add borders

Update badge.tsx subtle variants to include borders (0F above). Search/replace all hardcoded `bg-success/10 text-success border-success/20` → `<Badge variant="success-subtle">`. Replace raw `<span>` pseudo-badges.

### 1F. Forms → TanStack Form only

Migrate React Hook Form dialogs to TanStack Form:
- `add-client-dialog.tsx`
- `create-location-dialog.tsx`
- Any other RHF-based forms found

Remove `react-hook-form` and `@hookform/resolvers` from package.json. Keep `@tanstack/react-form`.
Update shadcn `<Form>` wrapper or create a TanStack Form equivalent if needed.

### 1G. Dialogs → `patterns/dialogs/modal.tsx` with size prop

Sizes: sm=400px, default=500px, lg=600px, xl=800px, full=900px. All dialogs migrate to `<Modal size="...">`.

Add reusable `useUnsavedChanges` hook for discard confirmation (currently ad-hoc AlertDialog in some dialogs).

### 1H. Page Layout → `PageShell` + `PageHeader` everywhere

- Dashboard and Org Detail must wrap in `PageShell`
- All pages use `PageHeader` (with variant="hero" for dashboards)
- Standardize section gap to `gap-8` (`--section-gap: 2rem`)
- Delete `StreamsFamilyHeader` → use `PageHeader variant="hero"`

### 1I. Loading → 3 tiers

1. Page-level: `PageSkeleton` matching PageShell + StatRail + table shape
2. Section-level: DataTable built-in skeleton
3. Action-level: `LoadingButton` (already exists)

Remove ad-hoc centered `<Loader2>` divs and text-only loading messages.

### 1J. Error States → `ErrorEmptyState` or `Alert variant="destructive"`

Replace all hand-rolled `bg-destructive/5` error divs.

### 1K. Animations → Framer Motion patterns ONLY

- Replace CSS `animate-fade-in-up` with `<FadeIn>`
- Define tiers: **Always** (page FadeIn, KPI StaggerContainer), **Interactive** (cards HoverLift), **Never** (table rows, form fields)
- Ensure all list pages use StaggerContainer consistently

**Files:**
- `frontend/components/patterns/tables/data-table.tsx`
- `frontend/components/patterns/data-display/kpi-card.tsx`
- `frontend/components/ui/badge.tsx`
- `frontend/components/patterns/dialogs/modal.tsx`
- `frontend/components/patterns/layout/page-shell.tsx`
- `frontend/components/patterns/layout/page-header.tsx`
- `frontend/components/patterns/feedback/empty-state.tsx`
- `frontend/components/patterns/inputs/filter-bar.tsx`

---

## Phase 2: shadcn Component Premium Customization

### 2A. Card → Subtle premium touches
- Base: `rounded-xl border-outline-variant/60 bg-card shadow-xs transition-[shadow,transform] hover:shadow-sm`
- Add optional accent slot: 2px gradient top strip on featured/hero cards

### 2B. Button → Add `success` variant, ensure icon sizing via `data-icon`

### 2C. Input → Enhanced focus: `box-shadow: var(--focus-ring), 0 0 0 1px var(--primary)`

### 2D. Table → Row hover `bg-primary/3`, header `bg-surface-container-low`, sticky header support

### 2E. Forms → Migrate to `FieldGroup` + `Field` pattern per shadcn best practices (not raw `div` wrappers)

**Files:** `frontend/components/ui/card.tsx`, `button.tsx`, `input.tsx`, `table.tsx`

---

## Phase 3: Premium Design Touches

### 3A. Glass Morphism — Extend usage
Currently only in auth. Apply `glass-liquid-subtle` to sidebar, `glass-popover` to dropdowns.

### 3B. Gradient Accent Strips
2px `--gradient-primary` top strip on dashboard hero cards and KpiCard variant="accent".

### 3C. Typography
- Enforce `font-display` (Manrope) on all h1/h2
- `tracking-tight` on headings
- Table headers: standardize `text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground`

### 3D. Surface Depth Consistency
- Page bg: `--background` (0.975)
- Cards: `--card` (0.99)
- Sidebar: `--sidebar` (0.955)
- Table headers: `--surface-container-low` (0.965)
- Nested panels: `--surface-container` (0.945)

### 3E. Micro-interactions
- `AnimatedCounter` on all KPI values (already exists, enforce usage)
- `HoverLift` on KPI and action cards only
- `FadeIn` on every page enter

---

## Phase 4: Page Migration Order

### Wave 1 — Foundation (highest traffic + worst drift)
1. **Field Agent Dashboard** — wrap in PageShell, use StatRail+KpiCard, standardize radius
2. **Admin Dashboard** — replace `ui/data-table.tsx` with patterns DataTable, wrap in PageShell
3. **Streams list** — replace StreamsFamilyHeader, unify KpiCard API

### Wave 2 — Admin CRUD
4. **Organizations list** — add pagination, verify FilterBar
5. **Organization Detail** — wrap in PageShell, use StatRail
6. **Feedback** — migrate to FilterBar + DataTable with expandable rows
7. **Proposal Ratings** — replace hand-rolled KPIs, FilterBar, DataTable pagination
8. **Users** — verify consistency (already closest to standard)

### Wave 3 — Offers & Detail
9. **Offers list + archive** — standardize animations (archive page missing them)
10. **Client Detail** — use PageHeader, standardize KPIs
11. **Client Contacts** — use PageHeader (currently custom heading)
12. **Offer Detail** — use PageHeader with breadcrumb

### Wave 4 — Forms & Dialogs
13. Migrate React Hook Form dialogs → TanStack Form (`add-client-dialog.tsx`, `create-location-dialog.tsx`)
14. Migrate all dialogs to `<Modal size="...">` pattern
15. Add `useUnsavedChanges` hook where missing

### Wave 5 — Cleanup
16. Delete dead components: `ui/data-table.tsx`, `StreamsFamilyHeader`, duplicate `empty-state.tsx` and `confirm-purge-dialog.tsx` in ui/
17. Remove `react-hook-form` and `@hookform/resolvers` dependencies
18. Replace all hardcoded badge classes and arbitrary rounded values

---

## Phase 5: Verification

### How to test
1. `cd frontend && bun run check:ci` — passes after each wave
2. Visual regression: screenshot each page before/after (use Playwright or manual comparison)
3. Contrast check: verify all badge variants on white card surfaces meet WCAG AA (4.5:1 for text)
4. Dark mode: verify all new tokens have dark mode equivalents
5. Responsive: verify field-agent pages on tablet viewport (768px-1024px)
6. Reduced motion: verify `prefers-reduced-motion` still disables all animations

### Acceptance criteria per wave
- All pages in wave use `PageShell` + `PageHeader`
- Zero hardcoded badge classes
- Zero arbitrary `rounded-[*]` values
- ONE table implementation (DataTable)
- ONE filter pattern (FilterBar)
- KpiCard has simplified API (~7 props)

---

## Decisions Made

- **Color rollout:** Big-bang in globals.css (no users yet, clean single update)
- **Dark mode:** Update dark tokens alongside light (maintain full parity)
- **Form library:** TanStack Form is the standard. Migrate RHF dialogs to TanStack Form.
- **Design docs:** No Storybook/docs page. Well-documented code with JSDoc only.

## Open Questions

1. **Do we want the `Empty` component from latest shadcn?** — We have a custom `EmptyState` in patterns. shadcn now ships its own `Empty` component. Keep ours or migrate?
