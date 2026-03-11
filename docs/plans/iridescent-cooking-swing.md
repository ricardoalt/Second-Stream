# Dashboard Wireframe Alignment — Phase 3

## Context

Phases 1-2 complete. Team produced Figma wireframes defining the target dashboard. This phase aligns implementation with those wireframes.

---

## Implement Now

### 1. Header simplification
**Files:** `dashboard-header.tsx`, `page.tsx`, `dashboard-store.ts`
**Type:** UI change + store cleanup (product decision: remove filtering)

**Target:** Search bar + "Discovery Wizard" button. Nothing else.

**Remove from `dashboard-header.tsx`:**
- Title `<h1>Dashboard</h1>` + subtitle `<p>`
- Company filter Select + all `useCompanyStore` usage
- Archived filter `ArchivedFilterSelect`
- Mobile filter Sheet + trigger button + `activeFilterCount` badge
- `buildSubtitle()` helper function
- Imports: `Building2`, `SlidersHorizontal`, `Badge`, `Sheet*`, `ArchivedFilterSelect`, `ArchivedFilter` type

**Keep:** Search input with debounce (unchanged). CTA button — rename label from "New Waste Stream" → "Discovery Wizard" (maps to `PremiumProjectWizard` which is a 3-step stream creation wizard: Basic Info → Waste Stream Details → Confirmation).

**Store state cleanup (`dashboard-store.ts`):**
- Hardcode `filters.archived` to `"active"` — remove `setArchivedFilter` action
- Remove `setCompanyFilter` action
- Remove `companyId` and `archived` from `filters` interface (they become implicit: always `active`, no company scoping)
- Update `loadDashboard` to always pass `archived: "active"`, no `companyId`
- Update `resetStore` accordingly

**`page.tsx` cleanup:**
- Remove `useCompanyStore` import + destructure (lines 51-58)
- Remove both `useEffect` chains for company loading/validation (lines 63-101)
- Remove `archivedScope`, `pendingArchivedRefreshRef`, all company-sync state
- Replace with: `useEffect(() => { loadDashboard(); }, [loadDashboard])`
- Remove `useDashboardFilters` import (no longer needed in page)

**Risk:** If a user previously had `companyId` or `archived=all` in store state (persisted via browser), removing those fields from the store interface means Zustand will ignore them on next hydration. No migration needed since we use `immer` middleware without `persist`. Safe.

### 2. Lock table columns to Figma
**Files:** `persisted-stream-table.tsx`, `stream-row.tsx`

**Exact column specs per bucket:**

| Bucket | Columns |
|---|---|
| `total` | Name, Client/Location, Volume/Frequency, Missing Information, Status |
| `needs_confirmation` | Name, Client/Location, Volume/Frequency |
| `missing_information` | Name, Client/Location, Volume/Frequency, Missing Information |
| `intelligence_report` | Name, Client/Location, Volume/Frequency |
| `proposal` | Name, Client/Location, Volume/Frequency, Missing Information, Status |

**Changes to `getColumnsForBucket()`:**
- Remove "Activity" column from all buckets
- Add "Missing Information" column (`w-36 hidden md:block`) for `total`, `missing_information`, `proposal`
- "Status" column stays for `total`, `proposal` only
- "Volume/Frequency" replaces "Volume" label (cosmetic)

**Changes to `PersistedRow` in `stream-row.tsx`:**
- Remove Activity/clock column entirely (the `useRelativeTime` + Clock icon section)
- Add Missing Information cell: reads `row.missingRequiredInfo`
  - If `true`: show text "Missing info" in `text-destructive/70` (placeholder until backend sends field names)
  - If `false`: show "—" in `text-muted-foreground/50`
- Accept new prop `showMissingInfo?: boolean` alongside existing `showStatus`
- Stale indicator (item 4 below) uses the space freed by removing Activity

**`persisted-stream-table.tsx`:**
- Update `showStatus` logic: `bucket === "total" || bucket === "proposal"`
- Add `showMissingInfo` logic: `bucket === "total" || bucket === "missing_information" || bucket === "proposal"`
- Pass both props through `<StreamRow>`

### 3. Simplify Needs Confirmation view
**Files:** `draft-queue-table.tsx`, `stream-row.tsx`

Figma: 3 columns only — Name, Client/Location, Volume/Frequency.

**Changes to `DraftRow` in `stream-row.tsx`:**
- Remove Confidence column (`row.confidence` section, lines 304-315)
- Remove Activity/clock column (lines 318-321)
- Keep: Name + inline badges (source + status), Client/Location, Volume, "Review →" hover CTA, orphan disabled state

**Changes to `draft-queue-table.tsx` column headers:**
- Replace current headers with: "Draft stream" (flex-1), "Client / Location" (w-36 hidden lg:block), "Volume" (w-28 hidden md:block)
- Remove Confidence + Activity header slots

### 4. Stale stream indicator
**Files:** `stream-row.tsx`
**Type:** Pure UI, uses existing data

Compute: `staleDays = Math.floor((Date.now() - new Date(row.lastActivityAt).getTime()) / 86_400_000)`

If `staleDays >= 7`: render `<Badge variant="outline" className="text-[10px] border-warning/30 bg-warning/5 text-warning">Stale · {staleDays}d</Badge>` inside the Name cell (below stream name, alongside mobile company/location info).

Show in buckets: `total`, `missing_information` only. These are where stale awareness drives action.

### 5. Empty state improvements
**Files:** `persisted-stream-table.tsx`, `draft-queue-table.tsx`, `page.tsx`

Update `EMPTY_DESCRIPTIONS` map and add CTA for `total` bucket:
- `total`: "Create your first waste stream" + CTA button "Discovery Wizard" (needs `onCreateProject` callback — pass as prop from `page.tsx` → `PersistedStreamTable`)
- `needs_confirmation`: "All caught up! No drafts awaiting review."
- `missing_information`: "All streams have complete information."
- `intelligence_report`: "No streams ready for insights yet."
- `proposal`: "No streams in commercial follow-up."

**Product decision:** Only `total` empty state gets an action button. Others are positive-completion states.

### 6. Make Proposal and Intelligence Report visually distinct
**Type:** Product decision

Already enforced by column configs (item 2):
- **Intelligence Report**: simple 3-column table (Name, Client/Location, Volume). Clean, minimal — these are "done" streams ready for review. No status noise.
- **Proposal**: 5-column table with Missing Information + Status columns. Status shows `ProposalStateBadge` with follow-up state (Uploaded, Waiting to Send, etc.). `ProposalSubfilters` component already provides sub-state filtering.

Additional: Intelligence Report rows could get a subtle visual cue (e.g. left-border accent `border-l-success` is already set via `BUCKET_BORDER`). No code change needed — already distinct.

---

## Defer (not this PR)

- **Micro-insights on stat cards** — SaaS polish, not in wireframes
- **Animated count transitions** — SaaS polish, not in wireframes
- **Keyboard navigation (j/k)** — power-user feature, not in wireframes
- **Backend: `missing_fields: list[str]`** — needed to populate the "Missing Information" column with actual field names (SDS, Chemical Composition, etc.) instead of placeholder text
- **Backend: `owner_name`** — wireframe shows "Owner: John" below stream name
- **Backend: `waste_category`** — wireframe shows category (Solvents, Metals) below stream name

---

## Open Questions / Risks

1. **"Missing Information" column is placeholder** — without backend `missing_fields`, we can only show "Missing info" vs "—". Is this acceptable for now, or should we defer the column entirely until backend is ready?
2. **Company filter removal is irreversible for users** — once removed, no way to scope dashboard to a single company. If this is needed later, it requires re-adding UI. Confirm this is intentional.
3. **Archived streams become invisible** — hardcoding `archived: "active"` means archived streams are never shown on dashboard. Users would need to navigate to individual company/stream pages to see archived items. Confirm.
4. **`useRelativeTime` removal** — removing Activity column means no time-ago display. The stale badge (item 4) partially replaces this for old items. Recent activity info is lost. Acceptable?

---

## Verification

```bash
cd frontend && bun run check:ci
```
- Biome format + lint pass
- Next.js build (type check) passes
- Visual checks:
  - Header: search + "Discovery Wizard" button only
  - Each bucket: columns match Figma table exactly
  - Needs Confirmation: 3-column simplified view
  - Stale badge shows on streams >7d inactive (total + missing_information)
  - Empty states: CTA on total, positive text on others
  - Proposal: has ProposalSubfilters + Missing Info + Status columns
  - Intelligence Report: clean 3-column table, no Status clutter

## Critical Files
- `frontend/components/features/dashboard/components/dashboard-header.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/lib/stores/dashboard-store.ts`
- `frontend/components/features/dashboard/components/persisted-stream-table.tsx`
- `frontend/components/features/dashboard/components/stream-row.tsx`
- `frontend/components/features/dashboard/components/draft-queue-table.tsx`
