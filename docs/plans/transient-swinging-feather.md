# Fix StatusChip badge overflow — Design System pattern

## Context

StatusChip badges overflow in `streams-all-table.tsx`. Root cause: fixed heights (`h-5`..`h-8`) without `whitespace-nowrap`, and no built-in truncation for long text. This needs a reusable design system solution, not call-site patches.

## Changes

### 1. StatusChip base: add `whitespace-nowrap` (structural fix)
**File:** `frontend/components/patterns/feedback/status-chip.tsx` line 15

```diff
- "inline-flex items-center justify-start gap-1.5 font-medium transition-colors"
+ "inline-flex items-center justify-start gap-1.5 font-medium transition-colors whitespace-nowrap"
```

Fixed height + inline-flex requires `whitespace-nowrap`. This is a missing structural property, not a new feature. Safe for all ~15 consumers.

### 2. Add `truncate` boolean variant to StatusChip (design system pattern)
**File:** `frontend/components/patterns/feedback/status-chip.tsx`

Add `truncate` to the CVA variants:

```ts
truncate: {
  true: "overflow-hidden",
  false: "",
},
```

Default: `false`. When `true`, the outer `<span>` gets `overflow-hidden`.

Add `truncate` to the props interface and destructure it in the component.

On the label `<span>` (line 194), conditionally apply truncation:

```tsx
<span className={cn(truncate && "min-w-0 overflow-hidden text-ellipsis")}>
  {label}
</span>
```

**Why a variant and not just classes?** This makes truncation a first-class, documented capability of the design system. Any consumer with long dynamic text opts in with `truncate` + a `max-w-*` via className. The component handles the internal flex/overflow mechanics; the consumer only decides the width constraint.

**Usage pattern:**
```tsx
<StatusChip truncate className="max-w-[200px]" title={fullText}>
  {fullText}
</StatusChip>
```

### 3. Apply `truncate` in AlertBadge
**File:** `frontend/components/features/streams/streams-all-table.tsx` lines 200-209

```tsx
<StatusChip
  status={config.status}
  variant="subtle"
  size="sm"
  shape="rounded"
  icon={config.icon}
  truncate
  className="max-w-[220px]"
  title={label}
>
  {label}
</StatusChip>
```

- `truncate` — opt-in to the new design system pattern
- `max-w-[220px]` — layout decision stays at call site
- `title={label}` — native tooltip for full text on hover (passes through `...props`)

## NOT changing
- `missing-information-stream-row.tsx` — doesn't use StatusChip, has its own inline truncation already
- Other StatusChip consumers — short labels, unaffected by `whitespace-nowrap`, `truncate` defaults to `false`

## Verification
1. `bun run check:ci` passes
2. "Missing info" badge: single line, no wrapping
3. "CRITICAL: ..." badge: truncated with ellipsis, hover shows full text
4. Spot-check offers table, dashboard for no regressions
