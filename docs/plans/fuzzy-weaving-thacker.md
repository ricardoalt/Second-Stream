# Dashboard & Needs Confirmation UI Polish

## Context

The dashboard bucket system and Needs Confirmation flow work correctly but feel generic. This plan improves visual quality, information hierarchy, scannability, and the confirmation drawer's trustworthiness — without changing backend logic or the bucket IA.

**Goal:** Sharper, more operational, more premium. Less generic SaaS.

---

## Phase 1: BucketTabs (`bucket-tabs.tsx`)

Standalone, high-impact, zero dependencies.

- **Remove description text** entirely (lines 107-109). Add `aria-description={tab.description}` to the button for screen-reader parity.
- **Reorder: count above label.** Count becomes the hero: `text-3xl font-bold font-display tabular-nums`. Label stays `text-[10px] uppercase tracking-wider`.
- **Move status badge** inline-right of label (same row, `ml-auto`).
- **Tighten padding:** `px-3.5 py-2.5` (was `px-4 py-3.5`). Gap `gap-1` (was `gap-1.5`).
- **Reduce grid gap:** `gap-2` (was `gap-3`). Margin `mb-2` (was `mb-4`).
- **Stronger active state:** `bg-accent/50 border-primary/40 shadow-md ring-1 ring-primary/30` (was `bg-accent/40 border-border/60 shadow-sm ring-1 ring-primary/20`).

## Phase 2: StreamRow — PersistedRow (`stream-row.tsx`)

- **Flat rows, not cards.** Remove `rounded-lg border border-border/40 bg-card/60`. Add `border-b border-border/20` as separator. Keep `border-l-3` only in `total` bucket (already the behavior via line 168).
- **Reduce padding:** `px-3 py-2.5 gap-3` (was `px-4 py-3 gap-4`).
- **Name:** `font-semibold` (was `font-medium`).
- **Metadata lighter:** sub-line to `text-muted-foreground/60`. Company column text from `text-foreground/80` to `text-muted-foreground`.
- **Hover:** `hover:bg-accent/30` (no border change).
- **Stale badge:** Replace pill Badge with inline text `text-[10px] text-warning/80` — `"Stale · Xd"` without pill chrome.
- **containIntrinsicSize:** `"0 48px"` (was `56px`).

## Phase 3: StreamRow — DraftRow (`stream-row.tsx`)

- **Remove source badge** (Import/Voice). Keep only status badge (Pending Review/Accepted/Amended).
- **Flat row treatment:** Remove `rounded-lg`. Replace `border border-dashed` with `border-b border-dashed border-amber-500/20`. Keep `bg-amber-50/50 dark:bg-amber-500/5`.
- **Reduce padding:** `px-3 py-2.5` (match persisted).
- **Volume fallback:** `"—"` instead of `"Pending"`.
- **containIntrinsicSize:** `"0 48px"`.

## Phase 4: Tables (`persisted-stream-table.tsx`, `draft-queue-table.tsx`)

- **Remove row gap:** `space-y-0` on motion containers (was `space-y-1.5`).
- **Column headers:** `py-1.5` (was `py-2`), `border-border/20` (was `/30`).
- **DraftQueueTable headers:** adopt `text-[11px] font-semibold uppercase tracking-wider` to match PersistedStreamTable (was `text-xs font-medium`).
- **Stagger:** reduce `staggerChildren` from `0.04` to `0.025`.
- **DraftQueueTable empty state:** `CheckCircle2` icon + `"Queue is clear"` title (was `AlertTriangle` + `"No drafts to confirm"`).

## Phase 5: DraftPreviewRail (`draft-preview-rail.tsx`)

- **Remove description paragraph** in CardHeader.
- **Compress DraftPreviewCard** to 2 lines:
  - Line 1: stream name (bold, truncated) + hover arrow
  - Line 2: company icon + label (or amber dot + "Pending") + volume if available
  - Remove: "AI extracted" label, source badge, "Awaiting confirmation" text, "Review draft" CTA, company-pending warning tooltip block.
- **Reduce card padding:** `p-2.5` (was `p-3`). CardContent `space-y-1.5` (was `space-y-2`).
- **CardHeader:** `pb-2` (was `pb-3`).

## Phase 6: ProposalSubfilters (`proposal-subfilters.tsx`)

- **Remove helper text** ("Filter proposals by follow-up stage.").
- **Active chip:** `bg-primary/15 text-primary border-primary/40 font-semibold` (was solid `bg-primary text-primary-foreground`).
- **Tighter chips:** `gap-1` (was `gap-1.5`), `px-2 py-0.5`.
- **Remove `space-y-2`** wrapper. Keep `relative` for gradient mask.

## Phase 7: DraftConfirmationSheet (`draft-confirmation-sheet.tsx`)

The biggest change. Three structural tiers:

### 7a. Group fields into sections

Replace flat `FIELD_ORDER.map(...)` with grouped rendering:

```ts
const FIELD_GROUPS: { label: string; keys: DraftConfirmationFieldKey[] }[] = [
  { label: "Identity", keys: ["company", "location"] },
  { label: "Material", keys: ["materialType", "materialName", "composition"] },
  { label: "Operations", keys: ["volume", "frequency", "primaryContact"] },
];
```

Each group gets a header: `text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground`.

### 7b. Summary status bar

Replace the two banners (grey info + amber warning) with a single inline status row showing decision counts:

```
● 5 confirmed  ○ 2 pending  ✕ 1 rejected
```

Green dot for confirmed, amber for pending, red for rejected. Derive via `useMemo` over `Object.values(contract.fields)`. Use `aria-live="polite"` for screen-reader updates.

### 7c. Decision button color semantics

Currently both Confirm and Reject use `border-primary bg-primary/10 text-primary` when active — **indistinguishable**.

- **Confirm active:** `bg-success/15 border-success/50 text-success-foreground dark:text-success`
- **Reject active:** `bg-destructive/15 border-destructive/50 text-destructive`

### 7d. Footer refinement

- Confirm button: `size="lg"` with `Check` icon prefix. Button text: "Confirm Stream" (was "Confirm Draft"). Use `bg-success hover:bg-success/90 text-success-foreground` when all required fields are satisfied (computed from `missingBaseFields.length === 0`).
- Show `"N required fields incomplete"` hint above footer when applicable.

## Phase 8: Page layout (`dashboard/page.tsx`)

- **Tab panel:** `rounded-md border border-border/30 bg-card/20 p-5` (was `rounded-lg border-border/40 bg-card/30 p-4`). Slightly less radius, more internal breathing room.
- **Skeleton sync:** remove third skeleton line in stat card skeleton (description removed). Adjust `py-2.5` to match new bucket card height.

---

## Verification

1. `cd frontend && bun run check:ci` — must pass (Biome + Next.js build)
2. Visual: check both light and dark mode
3. Test: open a draft from both the DraftPreviewRail and the DraftQueueTable
4. Test: confirm a draft, verify toast and dashboard reload
5. Test: switch buckets, verify counts update and active state is distinct
6. Test: mobile viewport (375px) — bucket cards 2-col, rows compress, drawer full-width
7. Test: proposal subfilters toggle on/off

---

## Files Modified

1. `frontend/components/features/dashboard/components/bucket-tabs.tsx`
2. `frontend/components/features/dashboard/components/stream-row.tsx`
3. `frontend/components/features/dashboard/components/persisted-stream-table.tsx`
4. `frontend/components/features/dashboard/components/draft-queue-table.tsx`
5. `frontend/components/features/dashboard/components/draft-preview-rail.tsx`
6. `frontend/components/features/dashboard/components/proposal-subfilters.tsx`
7. `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
8. `frontend/app/dashboard/page.tsx`

## Not Changed

- No backend changes
- No new dependencies
- No new files
- Dashboard store (`dashboard-store.ts`) untouched
- Dashboard types (`dashboard.ts`) untouched (description field stays in data, just not rendered)
- Route helpers untouched
