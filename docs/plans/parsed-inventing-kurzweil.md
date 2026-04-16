# Plan: Make the Discovery Loop Visible in Stream Workspace Mockup

## Context

The workspace demo at `frontend/components/features/workspace-demo/` renders cleanly but feels static. The core product loop — **add evidence → AI updates brief → user reviews → continue** — is invisible. The user can see state but not *flow*. This plan adds 7 coordinated changes that make causality, review urgency, and next actions self-evident without introducing chat, dashboards, or modals.

**Decisions locked:**
- Diff display: HoverCard inline on change chips (no expandable block)
- Demo trigger: simulation runs only on user interaction (no auto-play)

---

## Changes

### 1. Extend mock data (`mock-data.ts`)

Add types and constants to support change tracking + capture state:

```ts
// New types
BriefChange { id, pointId, field, previousValue, currentValue, triggeredBy, triggeredByType, timestamp }
CaptureState = "idle" | "processing" | "mapped"
CaptureResult { inputSummary, mappedPoints: string[], mappedLabels: string[] }
PrimaryActionType = "review" | "refresh" | "complete"

// Add to BriefPoint
changeId?: string  // links to BriefChange

// New constants
DEMO_BRIEF_CHANGES: BriefChange[] — 2 entries (volume + ph changes, triggered by docs)
DEMO_CAPTURE_RESULT: CaptureResult — maps to volume + ph points

// Helper
getPendingReviewCount() — counts needs-review + conflict points
```

### 2. New: `change-summary-strip.tsx`

Shows between ExecutiveSummary and brief when AI recently updated the brief. Makes "what changed and why" visible.

- Strip: `bg-primary/[0.04]`, `border border-primary/10`, rounded-lg, ~48px
- Left: teal animated pulse dot + "Brief updated at 11:42 AM"
- Center: change chips (e.g. "Volume updated", "pH qualifier added"), each clickable → selects that point
- Each chip: on hover → shadcn `HoverCard` showing previous value (struck through) → current value + evidence source badge
- Right: dismiss X button (local state)
- Entry animation: `FadeIn` from patterns

Props: `changes: BriefChange[], onPointSelect, onDismiss`

### 3. New: `review-banner.tsx`

Replaces the rail's PendingSignal. Lives in the main column for prominence.

- Strip: `bg-warning/[0.06]`, `border-l-2 border-warning`, rounded-r
- Content: "3 items need your review" + inline labels of pending items
- CTA: "Review next →" button selects first unreviewed point
- Persists while review items exist (not dismissible)

Props: `pendingItems, onReviewNext, onSelectPoint`

### 4. Modify: `workspace-header.tsx` — adaptive primary action

- Remove dual-button (Refresh Brief + Complete Discovery)
- Single adaptive primary button:
  - `reviewCount > 0` → "Review N items" (warning variant)
  - brief stale → "Refresh Brief" (outline)
  - else → "Complete Discovery" (default primary)
- Secondary actions → shadcn `DropdownMenu` (three-dot button)
- Props: `primaryAction: PrimaryActionType, reviewCount: number`

### 5. Modify: `brief-point-row.tsx` — enhanced review treatment

- Background tint always-on: `needs-review` → `bg-warning/[0.03]`, `conflict` → `bg-destructive/[0.03]`
- Left state bar: `w-1` (4px) for review/conflict states, keep `w-0.5` for confirmed/missing
- "Updated" label → shadcn `Badge` (primary-subtle, 9px) + shadcn `HoverCard` on hover showing diff (previous → current, evidence source)
- When selected AND needs review: show InlineReviewCluster below text — Accept (solid success), Incorrect (outline destructive), Verify + Add note (ghost)
- New prop: `change?: BriefChange`

### 6. Modify: `capture-bar.tsx` — processing state with feedback

State machine `idle → processing → mapped`:
- **idle**: current appearance (no change)
- **processing**: input disabled, placeholder "Processing...", thin `Progress` bar (h-0.5 indeterminate primary), spinner on submit button
- **mapped**: toast-strip slides up ABOVE the bar showing "Mapped to brief: Volume updated, pH qualifier added" with clickable chips → `onPointSelect`. `bg-success/[0.06]` with success left bar. Auto-dismiss 5s

Simulation triggers on submit click or voice click. Uses `setTimeout` (2s processing → mapped → 5s dismiss).

New props: `onPointSelect: (id: string) => void`. State managed internally for the demo.

### 7. Modify: `overview-tab.tsx` + `evidence-context-rail.tsx` — layout + wiring

**overview-tab.tsx:**
- Grid: `1fr 240px` → `1fr 296px`
- Insert order: ExecutiveSummary → ChangeSummaryStrip (conditional) → ReviewBanner (conditional) → DiscoveryBrief
- State: `showChangeSummary: boolean` (default true)
- Build `changesByPointId: Record<string, BriefChange>` lookup from `DEMO_BRIEF_CHANGES`, pass to BriefPointRow

**evidence-context-rail.tsx:**
- Remove `PendingSignal` component entirely (review moved to main column)
- Rail starts with context panel or empty state

**workspace-demo.tsx:**
- Lift `selectedPointId` state from OverviewTab to here (CaptureBar needs it)
- Pass `onPointSelect` to both OverviewTab and CaptureBar
- Compute `primaryAction` + `reviewCount` from mock data, pass to WorkspaceHeader

---

## Implementation order

```
1. mock-data.ts          (all new types/data)
2. change-summary-strip  ┐
   review-banner         ┘ parallel — new files, no deps
3. brief-point-row       ┐
   workspace-header      │ parallel — independent modifications
   capture-bar           ┘
4. evidence-context-rail   (remove PendingSignal)
5. overview-tab            (wire new components + grid)
6. workspace-demo          (lift state, wire orchestration)
```

## Critical files

- `frontend/components/features/workspace-demo/mock-data.ts`
- `frontend/components/features/workspace-demo/brief-point-row.tsx`
- `frontend/components/features/workspace-demo/capture-bar.tsx`
- `frontend/components/features/workspace-demo/overview-tab.tsx`
- `frontend/components/features/workspace-demo/workspace-demo.tsx`
- `frontend/components/features/workspace-demo/workspace-header.tsx`
- `frontend/components/features/workspace-demo/evidence-context-rail.tsx`
- `frontend/components/features/workspace-demo/change-summary-strip.tsx` (new)
- `frontend/components/features/workspace-demo/review-banner.tsx` (new)

## Verification

1. `cd frontend && bun run check:ci` — type + lint pass
2. `bun dev` → navigate to `/streams/demo`
3. Verify: ChangeSummaryStrip visible with 2 change chips, HoverCard shows diff on hover
4. Verify: ReviewBanner shows "3 items need review", "Review next" selects first review point
5. Verify: Header shows "Review 3 items" as primary, dropdown has Refresh/Complete
6. Verify: BriefPointRows with review/conflict states have tint + wider bar
7. Verify: Updated badge on volume point shows HoverCard with diff
8. Verify: Type in CaptureBar → submit → processing state → mapped toast with chips
9. Verify: Clicking mapped chip selects the corresponding brief point
10. Verify: Evidence rail no longer shows PendingSignal, starts with context panel

## Unresolved

- Should the ChangeSummaryStrip auto-dismiss after N seconds, or only on manual X? (Currently: manual only. Can add timer later.)
- The CaptureBar voice simulation — should it simulate transcription text appearing in the input before processing? (Deferred — current plan just triggers the processing flow on voice click.)
