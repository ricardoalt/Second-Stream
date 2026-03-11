# Plan: Needs Confirmation location editable Phase A

**Generated**: 2026-03-11
**Estimated Complexity**: Medium

## Overview

Goal: make `location` editable inside `Needs Confirmation` with autocomplete of existing locations, then inline create-new once backend semantics are stable. Keep `company` locked. Preserve current confirm/finalize semantics and partial finalize by `groupId`.

## Scope

- In scope:
  - editable `location` field in `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
  - search/select existing location for company-entrypoint drafts
  - create new location inline with minimal fields: `name`, `city`, `state`, optional `address`
  - backend-safe persistence path before finalize
  - tests for happy path + validation + finalize integrity
- Out of scope:
  - editable `company`
  - create/select company in this modal
  - broad workspace Phase 2 shell work

## Constraints

- `company` stays locked in this phase
- location editability only for `company` entrypoint runs in this phase
- selected/created location must belong to effective run company
- location must resolve to `name + city + state` before confirm
- keep gates: `company`, `location`, `volume`, `frequency`, and `materialName || materialType`
- keep `patchItem(amend)` + `finalize(resolvedGroupIds)` flow intact
- cancel/close modal must not persist partial location edits
- finalize retry/double submit must not create duplicate locations

## Sprint 1: Contract + UX shape

**Goal**: define one safe location contract for UI and finalize path, backend first.

**Demo/Validation**:
- draft modal shows location as editable only when run supports it
- selected existing location and create-new draft state both serialize to one contract shape

### Task 1.1: Lock shared location contract
- **Location**: `frontend/lib/types/dashboard.ts`, `backend/app/schemas/bulk_import.py`
- **Description**: define explicit location union across FE/BE: locked value, existing location reference, create-new payload. Avoid string-only location edits.
- **Dependencies**: none
- **Acceptance Criteria**:
  - no type assertions, no `any`
  - impossible to mark location resolved without required fields
  - contract makes persistence path explicit: existing reference vs staged new payload
- **Validation**:
  - typecheck in `bun run check:ci`

### Task 1.2: Define server mutation path + idempotence
- **Location**: `backend/app/schemas/bulk_import.py`, `backend/app/api/v1/bulk_import.py`, `backend/app/services/bulk_import_service.py`
- **Description**: support safe amend payload for parent location item so FE can either reference existing live location or stage new normalized location data with full context. Add explicit idempotent handling for finalize retries/double submit.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - server validates ownership and required location fields
  - selected existing location is stored as stable reference, not free-text re-resolution
  - create-new dedupe rule defined for `company + name + city + state`
  - no change to `company` semantics
- **Validation**:
  - backend tests for invalid company/location combos and duplicate retry behavior

## Sprint 2: Existing location select

**Goal**: allow choosing an existing location under current company with low risk.

**Demo/Validation**:
- user types in location field, sees matching company locations, selects one, confirms draft, project persists under selected location

### Task 2.1: Add location lookup endpoint/client
- **Location**: likely `backend/app/api/v1/*.py`, `frontend/lib/api/*.ts`
- **Description**: expose search for locations by company + query, returning id/name/city/state/address.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - results scoped to org + company
  - supports empty query for top suggestions or recent first if cheap
  - never returns locations from another company/org
- **Validation**:
  - API test for scope and filtering

### Task 2.2: Prove existing-location finalize path before UI
- **Location**: `backend/app/services/bulk_import_service.py`, `backend/tests/test_bulk_import.py`
- **Description**: implement and test selected-existing-location persistence + subset finalize before building combobox UI.
- **Dependencies**: Tasks 1.1, 1.2
- **Acceptance Criteria**:
  - finalize uses selected live location
  - no new location row created for existing selection
  - group finalize still works
- **Validation**:
  - backend integration test for selected existing location

### Task 2.3: Add combobox UI in confirmation modal
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
- **Description**: replace locked location input with combobox when editable; show selected existing location summary.
- **Dependencies**: Tasks 2.1, 2.2
- **Acceptance Criteria**:
  - keyboard usable
  - clear selected state
  - fallback copy when no matches
  - modal remains usable while search loads/fails
- **Validation**:
  - `bun run check:ci`
  - manual QA on desktop/mobile widths

## Sprint 3: Inline create-new location

**Goal**: allow creating a new location from same modal when no existing match fits. Ship only after Sprint 2 is stable.

**Demo/Validation**:
- user chooses “Create new location”, fills `name/city/state/address?`, confirms draft, finalize creates one new location and one project linked to it

### Task 3.1: Add create-new subform
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
- **Description**: add compact subform under location field for create-new mode.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - required fields inline validated
  - switching back to existing-selection mode preserves safe state
  - create-new appears as explicit CTA, not auto-switch
- **Validation**:
  - UI QA for empty/invalid/valid states

### Task 3.2: Stage new location data in import item
- **Location**: `backend/app/services/bulk_import_service.py`, `backend/tests/test_bulk_import.py`, `backend/tests/test_voice_interviews.py`
- **Description**: persist create-new payload into parent location item normalized data so current finalize path can create the location row.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - validate `name/city/state`
  - address optional
  - duplicate rule defined for `company + name + city + state`
  - duplicate-like match blocks or warns explicitly; no silent dupes
- **Validation**:
  - backend test: create-new location + project finalize subset

### Task 3.3: Keep readiness + errors correct
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`, `frontend/lib/types/dashboard.test.ts`
- **Description**: update readiness summary and field errors to treat location as resolved only when selected existing location or valid create-new payload exists.
- **Dependencies**: Tasks 3.1, 3.2
- **Acceptance Criteria**:
  - no false green readiness
  - error copy points user to missing part (`city`, `state`, etc.)
  - switching `existing` <-> `create-new` leaves no ghost-resolved state
- **Validation**:
  - frontend tests for readiness cases

## Sprint 4: Regression seal

**Goal**: prove no Phase 1 behavior regressed.

**Demo/Validation**:
- existing happy path still works
- new existing-location and create-new paths work
- finalize subset remains stable
- double submit/retry does not duplicate location rows

### Task 4.1: Backend semantic tests
- **Location**: `backend/tests/test_bulk_import.py`, `backend/tests/test_voice_interviews.py`
- **Description**: add focused tests for existing select, create-new, invalid location payload, wrong-company selection, subset finalize.
- **Dependencies**: prior sprints
- **Acceptance Criteria**:
  - failures are specific and deterministic
  - covers wrong-company selection, duplicate-like create-new, retry/double submit
- **Validation**:
  - `cd backend && make check`

### Task 4.2: Frontend checks + QA matrix
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`, dashboard flow
- **Description**: run CI checks and manual QA for loading, select existing, create new, validation, confirm success, cancel, small screens.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - `bun run check:ci` passes
  - modal usable on mobile and desktop
  - cancel/close does not persist partial edits
- **Validation**:
  - `cd frontend && bun run check:ci`

## Testing Strategy

- Backend first: semantic tests around amend/finalize
- Frontend second: type/lint/test via `bun run check:ci`
- Manual QA matrix:
  - existing location select
  - create new location
  - invalid create-new payload
  - duplicate-like input
  - partial finalize by `groupId`

## Risks & Gotchas

- Existing finalize assumes parent location item or entrypoint location; adding live-location selection needs one explicit path, not ad hoc conditionals.
- Duplicates can explode if create-new bypasses search; require explicit “Create new” action after no suitable match.
- Company/location drift is fatal; validate org + company ownership server-side.
- If Sprint 2 slips, still ship existing-location selection and split create-new into follow-up.

## Rollback Plan

- Keep `company` locked and gate `location` editability behind one branch in modal.
- If regressions appear, revert to locked location UI and keep visual redesign.

## Unresolved questions

- None.
