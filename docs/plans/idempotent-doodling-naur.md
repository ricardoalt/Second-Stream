# Design System Overhaul — Premium UI/UX 2026

## Context

SecondStream UI feels flat, inconsistent, and "too white." Badges are nearly invisible (18-20% color-mix on 0.975 lightness background = ~0.07 delta, needs ~0.15). Admin vs agent pages use different surface tokens. 3 competing status systems, 2 table systems, 2 confirmation dialogs, inconsistent form dialogs. Goal: premium, clean, modern B2B platform for waste-management field agents + admins.

---

## Phase 1: Color Token Fixes (`globals.css`)

### 1A. Badge tokens — increase contrast

**File:** `frontend/app/globals.css:284-335`

| Token group | Current bg mix | New bg mix | Current border mix | New border mix |
|---|---|---|---|---|
| success | 20% | **30%** | 42% | **55%** |
| warning | 20% | **30%** | 42% | **55%** |
| destructive | 18% | **28%** | 38% | **50%** |
| primary | 18% | **28%** | 38% | **50%** |
| neutral | 10% | **16%** | 20% | **32%** |
| info | 18% | **28%** | 40% | **52%** |

Text tokens — darken by ~0.04 lightness each:
- success-text: `oklch(0.28 0.14 150)` → `oklch(0.24 0.15 150)`
- warning-text: `oklch(0.31 0.12 68)` → `oklch(0.27 0.13 68)`
- destructive-text: `oklch(0.31 0.17 25)` → `oklch(0.27 0.18 25)`
- primary-text: `oklch(0.31 0.1 175)` → `oklch(0.27 0.12 175)`
- neutral-text: `oklch(0.23 0.014 235)` → `oklch(0.20 0.016 235)`
- info-text: `oklch(0.3 0.11 238)` → `oklch(0.26 0.12 238)`

### 1B. Background/card separation — more depth

```
--background: oklch(0.965 0.010 195)  /* was 0.975 — cards now float more */
--muted: oklch(0.92 0.016 200)        /* was 0.93/0.012 — visible sections */
```

### 1C. State backgrounds — bump from 15% to 20%

`globals.css:98-105` — all three `--state-*-bg` tokens: 15% → 20%

### 1D. Decision state backgrounds — bump from 8% to 12%

`globals.css:108+` — all `--decision-*-bg` tokens: 8% → 12%

---

## Phase 2: Component Consolidation

### 2A. Unify status display on StatusChip

**Keep:** `StatusChip` (patterns/feedback) as the ONE status component for all status display.
**Keep:** `Badge` (ui) as generic label/tag component (not for statuses).

Refactor:
- `frontend/components/features/streams/stream-status-badge.tsx` — switch from Badge to StatusChip
- `frontend/components/features/offers/components/offer-status-badge.tsx` — switch from Badge to StatusChip
- `frontend/app/admin/users/components/columns.tsx:96-110` — replace raw `<span>` with StatusChip

Also update StatusChip subtle variant to use badge CSS tokens (`--badge-*-bg/text/border`) instead of inline `color-mix()` so both systems produce identical colors.

### 2B. Confirmation dialog — keep ConfirmDialog, alias ConfirmModal

- `frontend/components/patterns/dialogs/modal.tsx` — make `ConfirmModal = ConfirmDialog` re-export
- Consumers (add-client-dialog, create-company-dialog, create-location-dialog, etc.) gradually migrate imports

### 2C. Table naming — rename CSS Grid DataTable → GridTable

- `frontend/components/ui/css-grid-table.tsx` — rename export from `DataTable` to `GridTable`
- Update consumer: `admin-dashboard-page-content.tsx`

### 2D. Dead code — `frontend/components/ui/form.tsx`

react-hook-form integration unused (all features use TanStack Form). Delete or add deprecation comment.

---

## Phase 3: Consistency Standardization

### 3A. Table headers — single standard from `table.tsx`

Standard: `text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground bg-surface-container-low/60`

Update `css-grid-table.tsx` header styling to match.

### 3B. All pages must use PageShell + PageHeader

- `frontend/app/admin/organizations/[id]/page.tsx:362-442` — refactor hand-rolled header to use PageHeader
- Add optional `leading` prop to PageHeader (`frontend/components/patterns/layout/page-header.tsx`) for back-button + avatar

### 3C. Form dialog golden standard = CreateCompanyDialog pattern

All form dialogs should use: `DialogFormContent` + `DialogFormHeader` + `DialogFormBody` + `DialogFormFooter` + `DialogFormActions`

Normalize `AddClientDialog`:
- Remove hardcoded `w-[min(94vw,780px)]`, use `size="lg"`
- Use `DialogFormFooter`/`DialogFormActions` instead of custom footer
- Use consistent input backgrounds

### 3D. Surface tokens — unify admin + agent pages

Migration: admin pages switch from `bg-muted` → `bg-surface-container-low` for section backgrounds. `bg-card` stays (valid surface level).

---

## Phase 4: Premium Visual Enhancements

### 4A. Score selector semantic fix

`frontend/components/features/proposals/score-selector.tsx:65` — replace `fill-amber-400 text-amber-500` with `fill-rating-star text-rating-star`

### 4B. Card elevation system

Ensure consistent use of existing utilities: `.card-flat`, `.card-raised`, `.card-floating`, `.card-interactive`
- KPI cards → `.card-interactive` (hover lift)
- Static info cards → `.card-raised`
- Table containers → `.card-flat`

### 4C. Gradient backgrounds for premium depth

Apply `--gradient-surface` to page backgrounds on key pages. Use `bg-page-gradient` utility already defined in globals.css.

### 4D. Typography consistency enforcement

- All page titles: `font-display text-2xl font-semibold tracking-tight`
- Section headings: `font-display text-sm font-semibold`
- Table headers: `text-[0.68rem] font-semibold uppercase tracking-wider`
- Body: Inter (default), no explicit font class needed

---

## Phase 5: Verification

1. **Contrast ratios**: verify all 6 badge variants meet WCAG AA (4.5:1 text, 3:1 large) in light + dark
2. **Visual diff**: screenshot streams table, admin users, org detail before/after
3. **Grep audit**:
   - `rg "ConfirmModal" --type tsx` — only re-export alias
   - `rg "amber-400|amber-500" --type tsx` — zero after score-selector fix
   - `rg "<span.*Active|<span.*Disabled" --type tsx` — zero after users migration
4. **Run checks**: `cd frontend && bun run check:ci`

---

## Execution Order

1. Phase 1 (CSS tokens) — zero component changes, immediate badge readability fix
2. Phase 2A (StatusChip unification) — depends on Phase 1
3. Phase 2B-2D (dedup/rename/cleanup) — independent, parallelizable
4. Phase 3 (page consistency) — depends on Phase 2 stable APIs
5. Phase 4 (premium polish) — independent, lowest risk
6. Phase 5 (verification) — alongside each phase

## Unresolved Questions

1. Should we also audit dark mode badge contrast or focus only on light mode first?
2. The `--background` lightness change (0.975 → 0.965) will subtly shift the entire app — should we do a visual review of ALL pages after this single change before continuing?
3. Should `ConfirmModal` be fully deleted or kept as alias indefinitely?
4. Is the `react-hook-form` `form.tsx` used anywhere we haven't found? Need full grep before deleting.
