# Plan: Workspace analysis flow follow-up

Generated: 2026-03-18
Complexity: Medium

## Overview

Refine the workspace so upload, analysis, and field creation feel intentional and understandable.

Main changes:

- upload evidence remains separate from AI analysis
- `Refresh Insights` becomes a clear analysis action
- analysis runs over the current completed evidence bundle
- confirmed AI fields become editable workspace fields, not static cards
- no standalone `Key Facts` block in this slice

## Prerequisites

- current workspace frontend + backend already merged
- specs:
  - `docs/plans/2026-03-17-workspace-v1-discovery-canvas-spec.md`
  - `docs/plans/2026-03-18-workspace-analysis-flow-follow-up-spec.md`

## Sprint 1: Clarify analysis UX

Goal: make the evidence -> analyze -> proposal flow explicit.

**Demo/Validation**:
- user can upload 2-3 files first
- workspace shows evidence state clearly
- one explicit action starts analysis

### Task 1.1: Rename and reframe analysis action
- **Location**: workspace header / evidence lane components
- Replace `Refresh Insights` copy with analysis-oriented copy:
  - `Start analysis`
  - `Re-run analysis`
- Move the action closer to the evidence lane if needed so it feels like the next step after upload
- **Acceptance Criteria**:
  - no UI copy suggests upload itself runs AI mutation
  - action purpose is obvious

### Task 1.2: Show evidence readiness state
- **Location**: evidence upload/list block
- Show compact status such as:
  - `No evidence uploaded`
  - `3 files uploaded`
  - `2 ready, 1 processing`
- disable analysis when `0` evidence items are completed
- **Acceptance Criteria**:
  - user can tell whether analysis will use current files or wait for some still processing

## Sprint 2: Reorder workspace information hierarchy

Goal: make editable information primary and remove non-essential derived blocks from the main flow.

**Demo/Validation**:
- user lands on fields first
- no derived read-only block interrupts the editable flow

### Task 2.1: Reorder left column
- **Location**: `frontend/components/features/workspace/workspace-canvas.tsx`
- Change main order to:
  - base fields
  - custom fields
  - missing information later/secondary
- **Acceptance Criteria**:
  - editable blocks appear first
  - no standalone `Key Facts` block remains in the main flow

### Task 2.2: Deprioritize missing information
- **Location**: workspace canvas / related block
- Move missing information lower or defer rendering if not ready
- **Acceptance Criteria**:
  - missing information does not distract from core data entry flow

## Sprint 3: Make confirmed custom fields editable

Goal: custom fields feel like real workspace fields, not frozen AI output.

**Demo/Validation**:
- confirm proposals
- resulting custom fields render as editable rows/inputs

### Task 3.1: Define editable custom-field frontend contract
- **Location**: frontend types/store + backend contract check
- Confirm whether backend already supports updating/deleting persisted custom fields
- If not, stop and add minimal backend follow-up plan rather than hacking around it
- v1 default scope: editable `label` + `answer` only; no manual add/delete/reorder unless already supported cleanly
- **Acceptance Criteria**:
  - implementation path is clear and not fake/read-only

### Task 3.2: Replace static custom-field cards with editable rows
- **Location**: workspace canvas/custom-fields component(s)
- Render custom fields in the same visual family as base fields
- Keep provenance/evidence refs secondary beneath the field
- **Acceptance Criteria**:
  - user can understand and edit confirmed fields naturally

## Sprint 4: Keep analysis result flow focused

Goal: analysis should update derived outputs and open proposal review, not mutate fields silently.

**Demo/Validation**:
- run analysis
- summary updates
- proposal modal opens if proposals exist
- workspace fields change only after confirm

### Task 4.1: Keep analysis action scoped to derived outputs + proposal batch
- **Location**: workspace store / header / proposal modal wiring
- Preserve explicit proposal confirm boundary
- define one active proposal batch only; re-run replaces prior unconfirmed batch
- **Acceptance Criteria**:
  - no direct field mutation from upload or analysis alone
  - no requirement to render backend `facts` as a dedicated visible section

### Task 4.2: Preserve summary stale behavior
- **Location**: workspace store/header
- Keep summary stale/until-refresh behavior aligned with current implementation
- **Acceptance Criteria**:
  - summary does not regenerate on every local edit

## Testing Strategy

- `frontend/bun run check:ci`
- `backend/make check`
- Manual smoke:
  - upload multiple files before analysis
  - verify upload alone does not change summary/custom fields
  - run analysis over completed bundle
  - verify proposal modal opens if proposals exist
  - confirm proposals and verify resulting custom fields are editable
  - verify no standalone `Key Facts` section distracts from editable fields

## Potential Risks & Gotchas

- current backend may not yet support editing persisted custom fields; if so, frontend should not fake editability
- renaming the action without moving its placement may still feel unclear
- evidence processing can finish after upload; the UI must explain that analysis uses completed files only

## Rollback Plan

- keep current workspace foundation intact
- if editable custom fields are blocked by backend gaps, ship only Sprint 1 + Sprint 2 first and preserve current read-only custom field rendering temporarily
