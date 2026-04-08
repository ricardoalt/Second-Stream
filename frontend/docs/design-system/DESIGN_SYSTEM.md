# SecondStream Design System

> Last updated: April 2026. Water treatment sector platform — admin (desktop, data-dense) and field-agent (mobile, quick-action) audiences.

---

## Architecture

```
globals.css          → design tokens (OKLCH, M3 surfaces, badge tokens, gradients)
components/ui/       → shadcn primitives (Button, Card, Badge, Input…)
components/patterns/ → reusable page patterns (PageShell, PageHeader, FilterBar, KpiCard…)
components/features/ → domain components (organized by feature, not by component type)
```

**Rule:** never import from `patterns/` in `ui/`, never import from `features/` in `ui/` or `patterns/`.

---

## Page Templates

### List Page (Streams, Clients, Offers, Admin tables)

```tsx
<PageShell gap="lg">
  <FadeIn direction="up">
    <PageHeader variant="hero" title="..." subtitle="..." actions={...} />
  </FadeIn>

  <StatRail columns={3}>
    <HoverLift><KpiCard title="..." value={...} icon={Icon} /></HoverLift>
    {/* repeat */}
  </StatRail>

  <FilterBar search={...} filters={[...]} activeFilterCount={n} onClear={...} />

  <TableContainer>
    <Table>...</Table>
    <TablePagination total={n} showing={m} page={p} pageCount={q} ... />
  </TableContainer>
</PageShell>
```

### Detail Page (Client, Stream, Org detail)

```tsx
<PageShell gap="lg">
  <PageHeader
    variant="default"
    title="..."
    breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: name }]}
    actions={...}
  />

  <StatRail columns={2}>
    <HoverLift><KpiCard ... /></HoverLift>
  </StatRail>

  <Tabs>
    <TabsList>
      <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    </TabsList>
    <TabsContent value="tab1">
      {/* content */}
    </TabsContent>
  </Tabs>
</PageShell>
```

### Settings Page

```tsx
<PageShell gap="default">
  <PageHeader variant="compact" title="Settings" breadcrumbs={[...]} />
  <div className="mx-auto flex max-w-xl flex-col gap-6">
    <Card>
      <CardHeader><CardTitle>Section</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">...</CardContent>
    </Card>
  </div>
</PageShell>
```

---

## Component Decision Tree

### Status display

| Context | Use |
|---------|-----|
| Table row / list | `<Badge variant="success-subtle">` (or other `-subtle` variant) |
| Hero card / dashboard KPI | `<StatusChip>` |
| Domain status (stream, offer) | `<StreamStatusBadge>` / `<OfferStatusBadge>` — these map to Badge `-subtle` internally |

**Never** use `variant="secondary"` + `className` overrides for status — that defeats the variant system.

### Tables

| Need | Use |
|------|-----|
| Sortable, filterable, paginated | `patterns/tables/data-table.tsx` (TanStack) |
| Simple expandable rows (e.g. admin agents) | `ui/css-grid-table.tsx` |

Always wrap in `<TableContainer>` for consistent border/radius/bg.

### Confirmation dialogs

| Need | Use |
|------|-----|
| Generic confirm/cancel | `<ConfirmDialog>` from `patterns/` |
| Archive org (has active users flow) | `<ConfirmArchiveDialog>` — has unique two-mode UI, do not replace |

### Loading skeletons

Use `<Skeleton>` from `ui/`. For full-page loading, use `TechnicalFormSkeleton` or `ProjectCardSkeleton` from `ui/loading-states`.

### Empty states

`<EmptyState icon={...} title="..." description="..." action={...} />` from `patterns/`.  
Never build custom `div`-based empty states.

### Error states

**Canonical pattern** — always use this:

```tsx
<Card className="border-0 bg-destructive/5 shadow-xs">
  <CardContent className="flex items-center gap-3 py-3">
    <AlertCircle aria-hidden className="size-4 shrink-0 text-destructive" />
    <p className="text-sm text-destructive">{message}</p>
  </CardContent>
</Card>
```

For errors with a Retry button, add it inline at the end of the `CardContent`.

---

## Badge Variants Reference

| Variant | Token prefix | Use for |
|---------|-------------|---------|
| `success-subtle` | `--badge-success-*` | Completed, active, resolved |
| `warning-subtle` | `--badge-warning-*` | Pending, missing info, open |
| `destructive-subtle` | `--badge-destructive-*` | Blocked, declined, error |
| `primary-subtle` | `--badge-primary-*` | In progress, active (alt) |
| `neutral-subtle` | `--badge-neutral-*` | Draft, expired, inactive |
| `info-subtle` | `--badge-info-*` | In review, informational |

Tokens use `color-mix(in oklch, ...)` for perceptually uniform blending on both light and dark surfaces.

---

## Semantic Tokens (globals.css)

### Surface hierarchy (M3-style)

```
--surface-container-lowest   → table row bg, card inner
--surface-container-low      → form input bg
--surface-container          → card bg
--surface-container-high     → sidebar, elevated panel
--surface-container-highest  → modal overlay
```

### Gradient tokens

| Token | Use |
|-------|-----|
| `--gradient-discovery` | Discovery wizard top bar |
| `--gradient-progress` | Loading progress bars |

Usage: `style={{ background: "var(--gradient-discovery)" }}` (gradients cannot be Tailwind utilities).

### Semantic color tokens

| Token | Replaces |
|-------|---------|
| `--rating-star` | `amber-400` for filled stars |
| `--rating-star-empty` | `amber-500/60` for empty stars |
| `--file-lab` | `blue-500` for lab document type |
| `--file-sds` | `amber-500` for SDS document type |
| `--file-photo` | `violet-500` for photo attachments |
| `--file-general` | `slate-500` for generic files |

---

## shadcn Best Practices Checklist

- **Icons in Button**: use `data-icon="inline-start"` or `data-icon="inline-end"` — no `mr-2`/`ml-2`/`size-4`
- **Icons in DropdownMenuItem**: use `className="size-4"` only — no `data-icon` here
- **Equal dimensions**: `size-8` not `w-8 h-8`
- **Spacing**: `flex flex-col gap-4` not `space-y-4`; `flex gap-4` not `space-x-4`
- **Semantic colors**: `bg-primary`, `text-destructive` — never raw `bg-blue-500`
- **Conditional classes**: `cn("base", condition && "variant")` — never template literals
- **Dark mode**: never `dark:` manual overrides — use semantic tokens

---

## Domain Components Location

Domain components live in `features/{domain}/` — **not** in `ui/`.

| Component | Location |
|-----------|----------|
| `CompanyCombobox` | `features/shared/company-combobox.tsx` |
| `LocationCombobox` | `features/shared/location-combobox.tsx` |
| `ProgressCard` | `features/shared/progress-card.tsx` |
| `TeamAvatar` / `AutoTeamAvatar` | `features/shared/team-avatar.tsx` |
| `StreamStatusBadge` | `features/streams/stream-status-badge.tsx` |
| `OfferStatusBadge` | `features/offers/components/offer-status-badge.tsx` |
| `OrgCard` | `features/admin/org-card.tsx` |
