# Proposal Detail View (Mock Standalone Page)

## Context

Standalone detail page at `/project/[id]/proposal` — same pattern as Intelligence Report page. Mock data, no backend. Entry from dashboard proposal bucket. Polished UI for demo. Ready to implement.

## Route: `/project/[id]/proposal`

## New files

### 1. `frontend/lib/types/proposal-detail.ts` — types

### 2. `frontend/lib/mocks/proposal-detail-mock.ts` — static mock data + getter

### 3. `frontend/app/project/[id]/proposal/page.tsx` — page (same pattern as `intelligence-report/page.tsx`)

### 4. `frontend/components/features/proposal-detail/` — components

**`proposal-detail-view.tsx`** — orchestrator. Two-column layout (`max-w-6xl`):
- Left: StreamDetailCard, IntelligenceReportCard, NotesCard
- Right (sticky): StatusCard, ProposalFileCard, UploadedFilesCard

**`status-card.tsx`** — prominent status badge + DropdownMenu with valid transitions only

**`stream-detail-card.tsx`** — stat tiles (volume/frequency/hazard) + composition bar + hazard badges + safety notes

**`intelligence-report-card.tsx`** — summary preview + insight bullets + "View full report" link

**`notes-card.tsx`** — textarea with autosave indicator

**`proposal-file-card.tsx`** — uploaded proposal file or empty state

**`uploaded-files-card.tsx`** — file list with type icons + hover download

## Modified files

### 5. `frontend/lib/routes.ts` — add `proposalDetail: (id: string) => /project/${id}/proposal`

### 6. `frontend/components/features/dashboard/components/stream-row.tsx` — line 89: `routes.project.proposalDetail(row.projectId)`

## Verification

`cd frontend && bun run check:ci` passes. Page loads at `/project/test-id/proposal`. Dashboard proposal bucket navigates to it.
