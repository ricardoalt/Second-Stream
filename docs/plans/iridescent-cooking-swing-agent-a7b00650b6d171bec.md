# Dashboard UX/UI Analysis: Current Implementation vs. Mockups

## Executive Summary

The current implementation is a solid, technically clean foundation. What the mockup adds is an **operational intelligence layer** — the dashboard stops being a passive list and starts being an active decision-support tool. The gaps are mostly additive (new components, new data fields), not corrective. The codebase quality is high and the existing patterns are well-structured to accept these additions.

---

## Gap Analysis by Area

### 1. Hero / Page Header

**Current state**: `DashboardHeader` renders a plain `h1` ("Dashboard"), a subtitle built from raw counts ("14 active · 3 need attention · 2 in proposal"), a search input, and company/archived filters. Height is minimal, tone is utility.

**Mockup target**: Large branded hero — "Opportunity Intelligence Dashboard" as the headline, a descriptive subtitle, and a prominent CTA. The visual weight signals this is the primary workspace, not just a list screen.

**Gaps**:
- Title is wrong ("Dashboard" vs. "Opportunity Intelligence Dashboard")
- Subtitle is raw counts rather than a human-readable insight sentence
- No visual distinction between the header zone and the data zone — they flow together with no structural break
- "New Waste Stream" button is small and right-aligned; mockup implies it should have more prominence or at minimum be labeled more contextually

**Recommendations**:
- Change `h1` to "Opportunity Intelligence Dashboard"; add `font-display` with `text-3xl font-bold tracking-tight`
- Replace the programmatic subtitle with a composed insight string: "X streams in motion · Y need attention today · Z in commercial follow-up"
- Add `pb-6 border-b border-border/30` to the header section to create a visual separation zone before the stat cards
- Keep filters in their current position — they work well as a second row

**Priority**: Medium impact, small effort

---

### 2. Stat Cards (BucketTabs)

**Current state**: 5 stat cards in a `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` layout. Each shows: label (11px uppercase), count (2xl), status badge, description. Top-border accent per bucket. Clickable to switch active bucket. Accessible (role=tablist, aria-selected).

**Mockup target**: 4 cards (not 5 — "Avg Stall Time" replaces a count-only card), each with:
- Large count
- Status badge (same pattern, good)
- Description text (same)
- A contextual insight line in a different color: "+8 this week", "11 streams need critical inputs"
- The stall time card has a "RISK" badge and sub-description: "3 opportunities waiting on info for 10+ days"

**Gaps**:

a. **Contextual insight line is missing entirely**. The mockup's strongest informational addition is a small secondary line under the description — a delta or severity indicator. In the current implementation the description is static copy from `BUCKET_TABS` config. This insight would need to be a backend-computed field (e.g. `weekDelta: +8`, `criticalCount: 11`).

b. **Avg Stall Time card is completely absent**. This is the highest-signal operational metric in the mockup. It tells a user at a glance whether the pipeline is healthy or stuck. The current `DashboardCounts` type has no `avgStallDays` or `stalledCount` field. This requires backend schema work.

c. **Card grid count mismatch**: Current is 5 cards (total + 4 pipeline stages). Mockup is 4 cards. If Avg Stall Time replaces Total, the "total" bucket tab needs to remain accessible via the filter paradigm or via an "All" pill tab.

d. **Active card visual treatment**: Current uses `bg-accent/40 ring-1 ring-primary/20`. Mockup implies a stronger active state — likely a filled card with the accent color bleeding more visibly. Consider `shadow-md` on the active card to lift it.

**Recommendations**:
- **Backend first**: Add `avgStallDays: number | null`, `stalledCount: number`, `weekDeltas: Record<DashboardBucket, number>` to `DashboardListResponse` and the corresponding backend schema
- **Frontend**: Add an `insight` computed field to `BucketTabConfig` (computed at render time from live counts + deltas) displayed as a `text-[10px]` line below the description, colored with the bucket's semantic token at 80% opacity
- **Stall card**: Add a new `stall` display-only card (not a bucket switch target) showing `avgStallDays` with RISK/OK badge logic: if `avgStallDays > 7` show warning-colored RISK badge, else success-colored OK
- Keep `total` as default bucket; the grid becomes: Total | Needs Confirmation | Missing Info | Intelligence | Proposal | StallTime (6 total, or collapse to 5 by making Total implicitly "all" and removing it from the tabs while keeping it as the default view)

**Priority**: High impact, medium effort (requires backend schema addition)

---

### 3. Missing Information Column

**Current state**: The `missing_information` bucket uses `BASE_COLUMNS` + `STATUS_COLUMN` — same columns as every other bucket (Waste Stream | Client/Location | Volume | Activity | Status). The Status column shows a generic "Missing Info" badge, which is redundant when you're already in the Missing Information bucket.

**Mockup target**: A dedicated "Missing Information" column showing percentage completeness (e.g. "67% complete") and/or a list of specific missing fields.

**Gaps**:
- `PersistedStreamRow` has `missingRequiredInfo: boolean` but no `completenessPercent: number` or `missingFields: string[]`
- The column config in `getColumnsForBucket` for `missing_information` currently returns the generic STATUS_COLUMN — no bucket-specific column differentiation beyond presence/absence
- The Activity column is present but irrelevant in this bucket; replacing it with completeness data would improve information density

**Recommendations**:
- **Backend**: Add `completenessPercent: number | null` and `missingFieldCount: number | null` to `PersistedStreamRow`
- **Frontend**: In `getColumnsForBucket`, for `missing_information` bucket replace the `STATUS_COLUMN` with a `MISSING_INFO_COLUMN` (`{ label: "Missing Information", className: "w-40 text-right hidden md:block" }`)
- In `StreamRow`/`PersistedRow`: render a compact completeness indicator for this bucket — a small progress arc or segmented pill bar (e.g. `w-24 h-1.5 rounded-full bg-border/40` with a filled portion colored by severity: <40% destructive, 40-70% warning, >70% success)
- Tooltip on the cell lists the specific missing field names

**Priority**: High impact, medium effort

---

### 4. Featured Stream / Highest-Leverage Hero Card

**Current state**: Does not exist.

**Mockup target**: A prominent card above (or beside) the main table showing the single highest-leverage stream today. Contains:
- Stream name + company
- Discovery coverage % + evidence confidence % (mini bar charts or circular progress)
- Proposal readiness indicator
- Pipeline stage dots (a horizontal stepper showing current stage)
- Primary blocker callout (text, e.g. "Missing: lab analysis results")
- "Review stream" CTA button

**Gaps**: Entirely absent. No data model for "leverage score", no blocker text, no stage pipeline visualization component.

**Analysis**: This is the highest-effort, highest-impact addition. It transforms the dashboard from a list into an intelligence surface. However, it requires:
1. A backend-computed `leverageScore` or equivalent ranking field
2. `discoveryPercent`, `confidencePercent`, `proposalReadiness` fields on `PersistedStreamRow` OR a separate `/dashboard/featured` endpoint
3. A new `FeaturedStreamCard` component

**Recommendations**:
- Phase 1 (lower effort): Add a `featuredStream` field to `DashboardListResponse` (returned only when bucket=total), populated by backend as the persisted stream with highest combined score of: `intelligenceReady=true + missingRequiredInfo=false + high volume`. This avoids a new endpoint.
- Phase 2: Add `discoveryPercent`, `confidencePercent`, `primaryBlocker: string | null` to the row type
- **Component structure**: `FeaturedStreamCard` — a horizontal card spanning the full width above the table, inside the `total` bucket's left-side flex column, rendered before `PersistedStreamTable`. Height approximately 120px. Use `--gradient-primary` (already in globals.css) as a subtle background on the left edge (via `border-l-4 border-primary`).
- Stage pipeline dots: 5 dots (one per bucket stage), filled up to the stream's current bucket. Use `DashboardBucket` to determine current position. This is pure client-side logic from existing data.
- The featured card should only appear in the `total` bucket, above the table, inside the existing `flex-1 min-w-0` column. Keep the draft rail aside.

**Priority**: High impact, large effort

---

### 5. Exceptions Rail / Critical Gaps

**Current state**: `DraftPreviewRail` exists — a right-side card showing draft items to review, with source type badge and company label. Styled amber/dashed border.

**Mockup target**: An "Exceptions Rail" replacing or augmenting the draft rail, showing:
- Critical Gaps section: named missing fields (Lab analysis, Process origin, Current cost) each with stall time (e.g. "12d stalled")
- Each item is a mini card with field name, stall days, and a direct action CTA

**Gaps**:
- The draft rail only surfaces `DraftItemRow` data — not per-field gap analysis for persisted streams
- No `stalledDays` or `gapType` concept exists anywhere in the type system
- The rail lacks the "critical exceptions" framing — it's purely about draft items, not about stalled persisted streams

**Recommendations**:
- Keep the existing `DraftPreviewRail` as-is for the `needs_confirmation` context
- Add a new `ExceptionsRail` component for the `total` bucket that appears alongside the `DraftPreviewRail` (or replaces it when there are no drafts)
- Requires backend: a `criticalGaps` field in `DashboardListResponse` — an array of `{ streamId, streamName, gapField, stalledDays }` objects, capped at 5
- Component: similar structure to `DraftPreviewRail` (Card, CardHeader, CardContent), but each item shows: field name in `text-sm font-medium`, stall time as a `text-xs text-destructive` badge if >7 days, company in `text-xs text-muted-foreground`, and a subtle right-arrow CTA

**Priority**: Medium impact, medium effort

---

### 6. Proposal Bucket Improvements

**Current state**: `ProposalSubfilters` renders 6 badge chips in a horizontal scroll. The table shows the same 5 columns as `total`. The proposal-state badge appears inline in the stream name cell (left side, in the name column), which is the correct pattern. However the Status column is redundant with the inline badge — it shows the same state twice.

**Gaps**:
- No count per subfilter chip — user can't see "3 Waiting to Send" vs "1 Under Negotiation" at a glance
- The Status column in proposal view is redundant (badge already in name cell)
- No "days since sent" or "follow-up age" column — the most operationally relevant metric for proposals

**Recommendations**:
- Add counts to subfilter chips: each `ProposalFollowUpState` count should come from backend (add `proposalStateCounts: Record<ProposalFollowUpState, number>` to `DashboardListResponse`). Render as a small number inside each chip badge: "Waiting to Send (3)"
- In proposal bucket's `getColumnsForBucket`, replace the `STATUS_COLUMN` with a `FOLLOW_UP_AGE_COLUMN`: `{ label: "Days Since Sent", className: "w-32 text-right hidden md:block" }`. Requires `proposalSentAt: string | null` on `PersistedStreamRow`.
- Remove the duplicate status badge from the name cell when in the proposal bucket (the `showProposalBadge` logic in `PersistedRow` should be `bucket !== 'proposal' && showProposalBadge`)

**Priority**: High impact, small-medium effort

---

### 7. Column Differentiation Per Bucket

**Current state**: `getColumnsForBucket` exists and the structure is correct, but the differentiation is shallow:
- `total`: BASE_COLUMNS + STATUS
- `missing_information`: BASE_COLUMNS + STATUS (should be + COMPLETENESS)
- `proposal`: BASE_COLUMNS + STATUS (should be + FOLLOW_UP_AGE)
- `intelligence_report`: BASE_COLUMNS only (correct)
- `needs_confirmation`: handled by `DraftQueueTable` separately (correct)

**Gaps**: As noted above, `missing_information` and `proposal` both need bucket-specific columns instead of the generic STATUS column.

**Recommendations** (summary, details in sections 3 and 6 above):
- `missing_information`: replace STATUS with COMPLETENESS (`completenessPercent` bar + field count)
- `proposal`: replace STATUS with FOLLOW_UP_AGE (`daysSinceSent` number)
- `intelligence_report`: consider adding an INSIGHTS_READY column showing what the report contains (e.g. "3 insights" badge) if that data becomes available

**Priority**: High impact, small effort (once backend fields exist)

---

### 8. Stall Time Metric

**Current state**: No concept of stall time anywhere in the codebase.

**Mockup target**: "Avg Stall Time: 6.2d" as a stat card-level metric with RISK badge, plus per-stream stall time in the exceptions rail.

**This is a purely new backend capability** requiring:
- Track `lastProgressAt` on projects (when did the stage last change?)
- Compute `stalledDays = now - lastProgressAt` where `stalledDays > threshold`
- Aggregate `avgStallDays` across all active streams
- Add `stalledCount` for the RISK trigger

**UX implementation notes once data exists**:
- Stat card: render as a non-clickable metric card or make it clickable to filter the table to only stalled streams
- RISK badge: `stalledDays > 7` triggers warning styling; `> 14` triggers destructive styling
- In-row: a `⏱ 12d` chip in the `Activity` column position if `stalledDays > 3`, colored by severity

**Priority**: Medium impact (very high value), large effort (new backend tracking + schema changes)

---

### 9. Mobile Responsiveness

**Current state**: Mobile is handled reasonably well:
- Bottom sheet for filters (good)
- `MobileDraftBanner` surfaces draft awareness (good)
- Columns progressively hide below sm/md/lg breakpoints (correct approach)
- The stat card grid is `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` — the 5th card often orphans on md

**Gaps**:
- The 5-card grid creates a dangling card at `md` breakpoint — `grid-cols-3` means cards 4 and 5 are on row 2, with card 5 centered/left-aligned awkwardly
- Proposal subfilter chips have a right-fade gradient mask — but the "All" implicit state (no chip selected) isn't visually distinct from no filter active
- The `DraftPreviewRail` is `hidden lg:block` with no mobile equivalent beyond the `MobileDraftBanner`; on tablet (md) it's also hidden

**Recommendations**:
- Stat cards: change to `grid-cols-2 sm:grid-cols-3 xl:grid-cols-5` and add `col-span-2 sm:col-span-1` to the last card to prevent orphaning at sm. Or adopt a horizontal scroll container at mobile (`flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x`) with fixed-width cards (`w-44 shrink-0 snap-start`)
- Proposal chips: add an explicit "All" chip at position 0 that deselects all subfilters, styled as the active state when no subfilter is selected
- `DraftPreviewRail`: surface on tablet (md) via a collapsible section below the table (`<details>` or an Accordion component from shadcn), not a full-screen sheet

**Priority**: Medium impact, small effort

---

### 10. Empty States and Loading States

**Current state**:
- `TableSkeleton` exists — 5 skeleton rows, reasonable
- `EmptyState` component used with `FolderKanban` icon and bucket-specific copy
- `DashboardSkeleton` (page-level) covers the initial load well

**Gaps**:
- Empty state icons are generic (`FolderKanban` for all buckets) — bucket-specific icons would clarify context
- Empty state CTAs: for `total` the CTA could be "Create your first waste stream" as a button (not just text). Currently `EmptyState` likely renders just text.
- No loading state for the tab switch transition — the `AnimatePresence mode="wait"` with `duration: 0.15` is fast but there's no visual indicator that a new bucket is loading during that gap
- No empty state for search results that return 0 items (different messaging from "no streams at all")

**Recommendations**:
- Pass bucket-specific icon to `EmptyState`: `AlertTriangle` for `needs_confirmation`, `FileSearch` for `missing_information`, `CheckCircle2` for `intelligence_report`, `Send` for `proposal`, `Layers` for `total` — these already exist in `BUCKET_TABS`
- For `total` empty state: add a `Button` CTA wired to `onCreateProject` — requires threading the handler down
- Add a search-specific empty state: when `filters.search` is set and `persistedItems.length === 0`, render different copy: "No streams match '[query]'" with a "Clear search" link
- For bucket tab switch while loading: add a `loading && initialized` state that renders the previous content at `opacity-40` rather than immediately showing a skeleton (prevents flash)

**Priority**: Medium impact, small effort

---

### 11. Micro-interactions and Transitions

**Current state**:
- Staggered row reveal with `framer-motion` (`staggerChildren: 0.04`, `y: 8` to `0`) — well done
- `contentVisibility: auto` on rows for performance — correct
- `transition-colors duration-150` on row hover — appropriate
- Tab panel transitions: `opacity: 0 → 1, y: 6 → 0, duration: 0.15` — clean

**Gaps**:
- No transition on stat card active state switch — the border-t color change and bg change happen instantaneously; adding `transition-all duration-200` is already in the class but the ring/shadow change should also animate
- The stagger on rows re-fires on every bucket switch, even when rows don't change — consider a `key` based on `bucket + page` to control when the stagger runs vs. when it should be immediate
- No count animation on stat cards — when counts change, the numbers jump. A subtle number counter animation (via CSS or a small hook) would add polish
- Proposal subfilter chips have no active state transition — the badge variant swap between `outline` and `default` is instant; wrapping in `motion.button` with `layout` prop would animate width changes smoothly
- The `MobileDraftBanner` has no entrance animation — it mounts abruptly after data loads

**Recommendations**:
- Stat card count animation: use a simple `useCountUp` hook (10-line implementation, no library needed) that animates from 0 to the count value over 600ms with ease-out, triggered when `isInitialized` first becomes true
- Proposal chips: add `layout` prop to the `motion.div` wrapper (wrap the chip container in a `motion.div layout`) so width changes animate when chips are added/removed
- `MobileDraftBanner`: wrap in `AnimatePresence` with `motion.button` (`initial={{ opacity: 0, y: 4 }}`, `animate={{ opacity: 1, y: 0 }}`)
- Row stagger: only trigger when `bucket` or `page` changes, not on sort (sort changes `sortedItems` but doesn't warrant a full reveal animation — use `key={sort}` only if you want it, otherwise keep key stable during sort)

**Priority**: Low impact, small effort (high polish, minimal complexity)

---

### 12. Data Visualization Opportunities

**Current state**: Zero visualization — everything is text/badges.

**Mockup target**: The featured stream card shows circular progress indicators for discovery coverage and confidence. The exceptions rail implies severity gradients.

**Opportunities beyond the mockup**:
- Completeness bar in the `missing_information` bucket column (horizontal `progress`-style bar, `h-1.5 rounded-full`, colored by severity)
- Proposal funnel mini-visualization in the stat card or in a section header: a horizontal stacked bar showing the distribution across `waiting_to_send | waiting_response | under_negotiation | accepted | rejected` — purely from existing `proposalStateCounts` data
- Volume trend would require time-series data not currently in scope

**Recommendations**:
- Start with the completeness bar in the missing_information column — this is the highest-value smallest-effort data viz addition
- The circular progress indicators in the featured card can be built with SVG `stroke-dasharray` / `stroke-dashoffset` — no chart library needed, ~20 lines of SVG
- Defer the proposal funnel until `proposalStateCounts` is added to the backend response

**Priority**: Medium impact, small-medium effort (completeness bar is small; circular progress is medium)

---

## Prioritized Implementation Order

### Phase 1 — High impact, no backend schema changes (ship first)

| Item | Effort | Files touched |
|------|--------|---------------|
| Fix title to "Opportunity Intelligence Dashboard" | XS | `dashboard-header.tsx` |
| Improve subtitle to insight sentence | XS | `dashboard-header.tsx` |
| Header/content visual separator | XS | `dashboard/page.tsx` |
| Remove redundant Status badge from proposal bucket name cell | XS | `stream-row.tsx` |
| Add "All" chip to proposal subfilters | XS | `proposal-subfilters.tsx` |
| Bucket-specific empty state icons | XS | `persisted-stream-table.tsx`, `types/dashboard.ts` |
| Search-specific empty state copy | XS | `persisted-stream-table.tsx` |
| Count animation on stat cards (useCountUp hook) | S | `bucket-tabs.tsx` |
| Mobile stat card horizontal scroll | S | `bucket-tabs.tsx` |
| MobileDraftBanner entrance animation | XS | `dashboard/page.tsx` |
| Pipeline stage dots on stream rows (total bucket) | S | `stream-row.tsx` |

### Phase 2 — High impact, requires backend schema additions

| Item | Backend change | Frontend files |
|------|---------------|----------------|
| Completeness column in missing_information bucket | Add `completenessPercent`, `missingFieldCount` to row | `stream-row.tsx`, `persisted-stream-table.tsx` |
| Follow-up age column in proposal bucket | Add `proposalSentAt` to row | `stream-row.tsx`, `persisted-stream-table.tsx` |
| Proposal subfilter counts | Add `proposalStateCounts` to response | `proposal-subfilters.tsx`, `types/dashboard.ts` |
| Week delta on stat cards | Add `weekDeltas` to response | `bucket-tabs.tsx`, `types/dashboard.ts` |
| Critical gaps / exceptions rail | Add `criticalGaps[]` to response | New `ExceptionsRail` component |

### Phase 3 — High impact, large scope

| Item | Scope |
|------|-------|
| Stall time tracking + Avg Stall Time stat card | New backend field on projects (`lastProgressAt`), new aggregate query, new stat card slot |
| Featured stream / Highest-leverage-today card | New backend scoring, `featuredStream` in response, new `FeaturedStreamCard` component |
| Circular progress indicators in featured card | Frontend only, but depends on Phase 3 backend |

---

## Design System Notes

The existing OKLCH token system in `globals.css` is already rich enough to support all additions without new tokens:

- Stall time risk badge: use `--warning` for 7-14d, `--destructive` for 14d+
- Completeness bar: use `--destructive` for <40%, `--warning` for 40-70%, `--success` for >70% — all already defined
- Featured stream card gradient: `--gradient-primary` already exists
- The `--font-display` (DM Sans) should be used for all large numeric values in stat cards and the featured card for visual hierarchy consistency

No new color tokens are needed for any of the recommended additions.

---

## Accessibility Notes

- The stat cards already have `role="tablist"` / `role="tab"` / `aria-selected` — the stall time card (non-interactive) should have `role="status"` and `aria-live="polite"` so screen readers announce when it changes
- Proposal subfilter chips need `aria-pressed` instead of `aria-selected` since they're toggle buttons, not tab buttons
- The completeness progress bar needs `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Completeness: X%"`
- Featured stream "Review stream" CTA needs descriptive `aria-label` including the stream name: `aria-label="Review stream: Industrial Solvent Waste"`
- Color should never be the sole indicator for severity — the stall time risk badges must also use a text label ("RISK" / "OK"), which the mockup already shows correctly
