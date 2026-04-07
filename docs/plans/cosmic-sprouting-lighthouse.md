# SecondStream Design System Overhaul

## Context

The platform has a **solid token foundation** (OKLCH color system, M3-style surface hierarchy, badge tokens, glass morphism) and a **well-designed pattern layer** (`PageShell`, `PageHeader`, `KpiCard`, `FilterBar`, `StatusChip`, `TablePagination`). The problem is **adoption inconsistency**: ~40% of pages bypass these patterns with ad-hoc implementations, making each page feel like a different app. Additionally, badge tokens lack contrast (12-14% mix on near-white bg), hardcoded hex/raw colors exist in 5+ files, and duplicated components (2 DataTables, 2 EmptyStates, 5 confirmation dialogs) create confusion about which to use.

The goal: a **premium, consistent, modern** design system where every page follows the same visual language — especially important for the water treatment sector's dual audience (admin: data-dense desktop, field-agent: quick-action mobile).

---

## Phase 0: Token Enhancement (globals.css only)

Zero component changes. Instant visual lift across the entire app.

### 0A. Boost badge contrast

**File**: `frontend/app/globals.css` lines 264-311

Current badge tokens are too faint. Increase `color-mix` percentages:

| Token | Current | Target |
|-------|---------|--------|
| `--badge-success-bg` | `success 14%` | `success 20%` |
| `--badge-warning-bg` | `warning 14%` | `warning 20%` |
| `--badge-destructive-bg` | `destructive 12%` | `destructive 18%` |
| `--badge-primary-bg` | `primary 12%` | `primary 18%` |
| `--badge-neutral-bg` | `foreground 6%` | `foreground 10%` |
| All `-border` tokens | `30-35%` | `40-45%` |

Darken text tokens ~0.05 lightness units for WCAG AA compliance.

### 0B. Add `--badge-info-*` tokens (missing)

```css
--badge-info-bg: color-mix(in oklch, var(--info) 18%, var(--background));
--badge-info-text: oklch(0.32 0.10 238);
--badge-info-border: color-mix(in oklch, var(--info) 40%, transparent);
```

Add corresponding `@theme inline` mappings and dark mode overrides.

### 0C. Add semantic tokens for hardcoded colors

| Token | Replaces | Used in |
|-------|----------|---------|
| `--gradient-discovery` | `from-[#006565] to-[#008080]` | `top-bar.tsx:91` |
| `--gradient-progress` | `from-blue-500 to-blue-600` | `loading-states.tsx:339` |
| `--rating-star` / `--rating-star-empty` | `amber-400/500/600` | `score-selector.tsx`, `proposal-rating-widget.tsx` |
| `--file-lab/sds/photo/general` | `blue-500/amber-500/violet-500/slate-500` | `files-section/types.ts` |

---

## Phase 1: Component Consolidation

Delete dead code, consolidate duplicates. No visual changes.

### 1A. Delete unused `ui/empty-state.tsx` (0 imports)

### 1B. Migrate deprecated confirmation dialogs to `ConfirmDialog`

| Deprecated | Used in | Replace with |
|------------|---------|-------------|
| `ConfirmArchiveDialog` | `admin/organizations/page.tsx`, `admin/organizations/[id]/page.tsx` | `ConfirmDialog variant="destructive"` |
| `ConfirmRestoreDialog` | same 2 files | `ConfirmDialog variant="default"` |
| `ConfirmPurgeDialog` | check usage, likely 0 | delete if unused |

Add `requireConfirmation?: string` prop to `ConfirmDialog` for type-to-confirm pattern (streams delete-all-drafts needs it).

Delete deprecated files + update `patterns/index.ts`.

### 1C. Resolve dual DataTable

- Rename `ui/data-table.tsx` -> `ui/css-grid-table.tsx` (lightweight expandable-row use cases)
- `patterns/tables/data-table.tsx` = canonical default for all new tables
- Cross-reference JSDoc in each

### 1D. Move domain components out of `ui/`

Move to `features/shared/`: `company-combobox.tsx`, `location-combobox.tsx`, `archived-filter-select.tsx`, `progress-card.tsx`, `team-avatar.tsx`. Update all imports.

---

## Phase 2: Page Structure Normalization

Every page gets the same structural wrapper. Biggest visual consistency win.

### Standard page templates

**List page** (Streams, Clients, Offers, Admin tables):
```
PageShell gap="lg"
  FadeIn > PageHeader variant="hero"
  StaggerContainer > StatRail > HoverLift > KpiCard (always)
  FilterBar (always — replaces inline search/sort)
  TableContainer > Table + TablePagination
```

**Detail page** (Client, Stream, Org detail):
```
PageShell gap="lg"
  PageHeader variant="default" + breadcrumbs + actions
  StatRail > HoverLift > KpiCard
  Tabs > TabsContent > PageSection
```

**Settings page**:
```
PageShell gap="default"
  PageHeader variant="compact"
  max-w-xl mx-auto flex flex-col gap-6 > Cards
```

### Pages to migrate

| Page | Issues | Fix |
|------|--------|-----|
| `(agent)/clients/page.tsx` | No PageShell, no FilterBar, custom hero card, alternating rows, manual search/sort | Wrap in PageShell, use PageHeader hero, use FilterBar, standardize table |
| `(agent)/streams/page.tsx` | 2 inline paginations (non-functional stubs), inline filters, inline AlertDialog | Replace with TablePagination, FilterBar, ConfirmDialog |
| `settings/page.tsx` | No PageShell, `text-2xl font-bold` (not font-display), `space-y-6`, `h-4 w-4` | Wrap in PageShell, use PageHeader compact |
| `admin/organizations/[id]/page.tsx` | Custom header (no PageHeader), deprecated dialogs | Use PageHeader with breadcrumbs, migrate dialogs |
| All admin pages | Table container class divergence, inconsistent FadeIn/HoverLift wrapping | Standardize to `TableContainer` pattern |

### New `TableContainer` pattern component

```tsx
// patterns/tables/table-container.tsx
function TableContainer({ children, className }) {
  return (
    <div className={cn(
      "overflow-hidden rounded-xl border border-border/60 bg-surface-container-lowest",
      className
    )}>
      {children}
    </div>
  );
}
```

Replaces 5 divergent table wrapper patterns.

---

## Phase 3: Status Badge Unification

### Decision: Badge `-subtle` variants = canonical status indicators

Badge already has `success-subtle`, `warning-subtle`, `destructive-subtle`, `primary-subtle`, `neutral-subtle`. Add `info-subtle` (Phase 0B). This is the ONLY way to show status.

### Refactor status badge components

**`StreamStatusBadge`** (`features/streams/stream-status-badge.tsx`):
- Currently: `variant="secondary"` + className override (defeats variant system)
- Fix: map each `StreamStatus` to a Badge `-subtle` variant directly

**`OfferStatusBadge`** (`features/offers/components/offer-status-badge.tsx`):
- Same pattern as above

**`ClientStatusBadge`**: already correct (uses Badge variants). Use as reference.

### StatusChip: keep but demote
Add JSDoc marking it as "specialized use only (dashboards, hero cards). Prefer Badge `-subtle` variants for standard status display in tables and lists."

---

## Phase 4: Hardcoded Color Remediation

Replace all raw Tailwind/hex colors with Phase 0C tokens:

| File | Current | Replace with |
|------|---------|-------------|
| `top-bar.tsx:91` | `from-[#006565] to-[#008080]` | `bg-[var(--gradient-discovery)]` or utility class |
| `loading-states.tsx:339` | `from-blue-500 to-blue-600` | `from-primary to-primary-container` |
| `score-selector.tsx:62-65` | `amber-400/500` | `text-rating-star` / `text-rating-star-empty` |
| `proposal-rating-widget.tsx:202,210,301` | `amber-400/500/600` | same |
| `files-section/types.ts:65-89` | `blue-500,amber-500,violet-500,slate-500` | `file-lab/sds/photo/general` tokens |

---

## Phase 5: shadcn Best Practices Sweep

Mechanical code quality. No visual changes.

| Pattern | Find | Replace | Priority files |
|---------|------|---------|---------------|
| `size-*` | `h-4 w-4`, `h-5 w-5`, etc. | `size-4`, `size-5` | settings, top-bar, all icon usages |
| `gap-*` | `space-y-*`, `space-x-*` | `flex flex-col gap-*`, `flex gap-*` | settings, any remaining |
| `data-icon` | `<Icon className="mr-2 size-4" />` in Buttons | `<Icon data-icon="inline-start" />` | streams, settings |
| Card composition | `<Card className="p-6">raw</Card>` | `<Card><CardHeader>...</CardHeader><CardContent>...</CardContent></Card>` | audit all |

---

## Phase 6: Visual Polish

### 6A. Table row hover: standardize to `hover:bg-surface-container-low/80 transition-colors`
- Remove `hover:translate-x-[2px]` from Clients (gimmicky)
- Remove alternating row colors from Clients (no other table uses them)

### 6B. Animation consistency
- ALL list-page PageHeaders: wrapped in `FadeIn direction="up"`
- ALL KpiCards: wrapped in `HoverLift`
- ALL StatRails: wrapped in `StaggerContainer`

### 6C. Error state pattern
Standardize to one error display:
```tsx
<Card className="border-0 bg-destructive/5 shadow-xs">
  <CardContent className="flex items-center gap-3 py-3">
    <AlertCircle className="text-destructive" />
    <p className="text-sm text-destructive">{message}</p>
  </CardContent>
</Card>
```

---

## Phase 7: Documentation

Create `frontend/docs/DESIGN_SYSTEM.md`:
- Page templates (list, detail, settings) with code examples
- Component decision tree (Badge vs StatusChip, FilterBar vs SearchBar, etc.)
- Token naming conventions
- Color palette reference
- shadcn best practices checklist

---

## Execution order

```
Phase 0 (tokens) ──┐
                    ├──> Phase 2 (page structure) ──> Phase 5 (best practices)
Phase 1 (cleanup) ─┘                                        |
      |                                                      v
      └──> Phase 3 (badges) ──> Phase 4 (colors) ──> Phase 6 (polish)
                                                             |
                                                             v
                                                      Phase 7 (docs)
```

Phases 0+1 can run in parallel. Phases 2+3 can run in parallel. Phase 4 depends on Phase 0.

## Open questions

1. **Alternating row colors**: remove from Clients (align with all tables) or adopt everywhere? Rec: remove.
2. **ConfirmDialog type-to-confirm**: add `requireConfirmation?: string` prop, or keep streams' inline AlertDialog as exception? Rec: add the prop.
3. **StatusChip**: full deprecation or keep for niche use (hero cards, mobile)? Rec: keep, demote.
4. **FilterBar on Clients**: Clients has sort-by but no status filter. Use FilterBar (add sort config) or simpler SearchBar? Rec: FilterBar.
