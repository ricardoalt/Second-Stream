# Dashboard Final Pass - Split Plan

Date: 2026-03-10
Scope: dashboard only
Goal: close remaining Figma/content gaps before moving to workspace

## Overview

Dashboard IA is good. Remaining work is semantic + operational:
- show what is missing
- improve row glanceability
- make Proposal actionable inline
- make draft rail more informative

Do not redesign layout again.

## Frontend track

### FE-1 - Add last-updated context in Total
- Files:
  - `frontend/components/features/dashboard/components/stream-row.tsx`
- Add `Last updated {date}` as secondary text in Total rows.
- Use existing `lastActivityAt`.

### FE-2 - Use `Pending` fallback in Needs Confirmation
- Files:
  - `frontend/components/features/dashboard/components/stream-row.tsx`
  - `frontend/components/features/dashboard/components/draft-preview-rail.tsx`
- For missing client/location in draft rows, show `Pending`, not `—`.

### FE-3 - Inline proposal follow-up state editing
- Files:
  - `frontend/components/features/dashboard/components/stream-row.tsx`
  - `frontend/lib/api/dashboard.ts`
  - `frontend/lib/stores/dashboard-store.ts`
- In `Proposal` bucket, make commercial follow-up state editable via compact dropdown/popover.
- Use existing project-level PATCH endpoint.
- Optimistic update + rollback on failure.
- After mutation, reconcile counts, active subfilter, and row rebucketing.

### FE-4 - Enrich draft rail
- Files:
  - `frontend/components/features/dashboard/components/draft-preview-rail.tsx`
- Make rail closer to Figma:
  - stronger title/framing
  - source detail
  - volume if present
  - assignment warning
  - clearer review CTA

### FE-5 - Remove low-value chrome
- Files:
  - `frontend/components/features/dashboard/components/persisted-stream-table.tsx`
  - `frontend/components/features/dashboard/components/stream-row.tsx`
- Default to `Recent`.
- Remove visible sort dropdown.
- Keep stale badge only as secondary signal.

### FE-6 - Render new backend fields when available
- Files:
  - `frontend/lib/types/dashboard.ts`
  - `frontend/components/features/dashboard/components/stream-row.tsx`
- Add support for:
  - `missingFields`
  - `wasteCategoryLabel`
  - `ownerDisplayName`
- Row display target:
  - stream name
  - waste category below
  - owner below/adjacent when allowed
  - missing fields list in Missing Information / Total / Proposal

## Backend track

### BE-1 - Add explicit missing fields to dashboard rows
- Files:
  - `backend/app/schemas/dashboard.py`
  - `backend/app/api/v1/projects.py`
- Add `missing_fields: list[str]` to persisted dashboard row.
- Return human-readable labels, not raw keys.

### BE-2 - Add waste category label
- Files:
  - `backend/app/schemas/dashboard.py`
  - `backend/app/api/v1/projects.py`
- Add `waste_category_label: str | None`.
- Prefer normalized category source if available.

### BE-3 - Add owner display name with correct visibility
- Files:
  - `backend/app/schemas/dashboard.py`
  - `backend/app/api/v1/projects.py`
- Add `owner_display_name: str | None`.
- Return only when caller is allowed to see it.

### BE-4 - Keep proposal follow-up inline edit supported
- Files:
  - `backend/app/api/v1/projects.py`
  - related tests
- Reuse existing project-level PATCH endpoint.
- Confirm transitions + 409 behavior remain stable for inline usage.
- Ensure subfilter/rebucket behavior is predictable after state change.

### BE-5 - Tests with each backend change
- Files:
  - `backend/tests/test_projects.py`
- Add coverage for new dashboard fields, normalized labels, and visibility rules.

## Recommended order

1. BE-1
2. BE-2
3. BE-3
4. BE-4
5. BE-5
6. FE-1
7. FE-2
8. FE-4
9. FE-5
10. FE-3
11. FE-6

## Before moving to workspace

- Finish backend row contract expansion.
- Finish frontend row rendering for missing fields/category/owner.
- Finish inline proposal edit.
- Run desktop/mobile QA on all 5 buckets.

## Product decisions locked

- Keep dashboard active-only.
- Keep stale badge as supplemental signal.
- Remove visible sort dropdown.
- Show `Pending` for undetected draft fields.
- `missingFields` should display top 1-2 items + overflow hint if needed.
- `ownerDisplayName` should be visible only for org admins + superusers.
- `missingFields` should come from a canonical required-field map and return normalized human labels.

## Risks

- Inline proposal editing must not leave stale row state under active subfilter.
- Owner visibility logic must match current auth model exactly.
