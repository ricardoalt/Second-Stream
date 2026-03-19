# Plan: Workspace v1 discovery canvas

Generated: 2026-03-17
Complexity: Medium

## Overview

Redesign the persisted waste-stream workspace by reusing the current project/questionnaire base.

- `Needs Confirmation` stays separate and unchanged in this scope
- workspace starts only for persisted waste-streams
- keep 5 fixed base fields always visible
- evidence upload updates summary/facts and can open an AI proposal modal
- AI proposal modal creates **new custom fields only** after user review
- treat this as refinement/recomposition of the current workspace, not a rebuild

## Build strategy

Optimize for reuse, not reinvention.

- reuse `frontend/app/project/[id]/page.tsx`
- reuse `frontend/components/features/projects/technical-data-sheet.tsx`
- reuse current right-side notes/evidence area as much as possible
- reuse technical-data autosave/store patterns
- reuse file upload/browser infrastructure where possible
- replace the IA and layout before adding net-new AI workspace behavior

## Phase 0 - Lock contracts

Goal: remove ambiguity before UI work starts.

### Task 0.1 - Lock fixed base field set
- **Location**: spec + workspace field config
- define exact 5 base fields used by workspace readiness
- acceptance:
  - one canonical list exists in code/spec
  - same list used by coverage/readiness logic

### Task 0.2 - Lock AI proposal contract
- **Location**: spec + types
- define one proposal item shape:
  - `tempId`
  - `proposedLabel`
  - `proposedAnswer`
  - `selected`
  - optional evidence refs
- acceptance:
  - proposal modal is explicitly `new custom fields only`

Demo/validation:
- team can point to one fixed field contract and one proposal contract

## Phase 1 - Workspace IA cut

Goal: make the page feel like a workspace, not a questionnaire tab.

### Task 1.1 - Replace tab-first entry with workspace canvas
- **Location**: `frontend/app/project/[id]/page.tsx`, `frontend/components/features/projects/project-tabs.tsx`
- demote/remove `Questionnaire` as primary mental model for this route
- make the persisted stream land in workspace-first layout
- keep change tight: use same route with local view switch, not new navigation system

### Task 1.2 - Remove body overview; move summary/general info to top
- **Location**: workspace shell/new workspace component
- add top strip with:
  - company
  - stream name
  - location
  - primary contact
  - summary sentence
  - `Contacts` button
  - `Files` button
- add top working header with information coverage + main actions
- do **not** keep a separate redundant overview block in the body

Demo/validation:
- `/project/[id]` opens into workspace-first layout
- top summary/info is visible before detailed fields
- first focus area is the working canvas, not overview cards

## Phase 2 - Base fields block

Goal: keep the required stream-definition fields stable and obvious.

### Task 2.1 - Extract fixed base fields into dedicated block
- **Location**: `frontend/components/features/projects/technical-data-sheet.tsx` or new workspace subcomponent
- render 5 base fields in one stable block near top-left of main canvas
- preserve autosave/edit/source patterns from existing technical-data flow

### Task 2.2 - Separate readiness from coverage
- **Location**: workspace UI + supporting selectors
- `information coverage` stays informative
- `Discovery complete` gate uses only fixed base fields in v1

Demo/validation:
- base fields always visible
- readiness gate does not depend on custom fields

## Phase 3 - Evidence lane

Goal: add the new evidence-first working area without changing the whole backend model.

### Task 3.1 - Add right-side evidence lane
- **Location**: workspace layout + file components
- add:
  - evidence upload block
  - evidence list/status block
  - contextual note/instruction box
- reuse existing right-side pieces wherever possible; only remove AI suggestions from that lane

### Task 3.2 - Define simple AI refresh lifecycle
- **Location**: workspace actions / service hooks
- upload => extraction runs automatically per evidence item
- note changes alone do not auto-rerun
- `Refresh insights` applies current note/context to existing evidence

Demo/validation:
- upload flow works inside workspace
- evidence status is visible per item
- note box is present as context, not separate source

## Phase 4 - Files integrated view

Goal: keep files reusable and full-screen without breaking workspace context.

### Task 4.1 - Add same-route local files view switch
- **Location**: `frontend/app/project/[id]/page.tsx`, `frontend/components/features/projects/project-tabs.tsx`, reused files section
- `Files` button opens the current files system as a full-screen integrated view in the same route
- keep workspace context visible in framing/navigation
- do not create a brand-new files subsystem

Demo/validation:
- user opens `Files` from workspace top strip
- sees reused files UI in full-screen integrated view
- can return to workspace without route/context confusion

## Phase 5 - AI proposal modal

Goal: turn evidence analysis into user-approved custom field creation.

### Task 4.1 - Add transient AI proposal batch state
- **Location**: workspace state/types/api wiring
- store one proposal batch per completed analysis run
- do not persist as workspace fields yet

### Task 4.2 - Build AI proposal review modal
- **Location**: new workspace modal component
- modal shows proposed fields with editable:
  - field name
  - field answer
  - selected state
- confirm creates selected custom fields
- cancel discards batch

### Task 4.3 - Render accepted custom fields in workspace
- **Location**: workspace custom fields block
- accepted proposals become normal persisted custom fields
- keep custom fields non-blocking in v1

Demo/validation:
- upload evidence
- modal opens with AI proposals
- user edits/selects proposals
- confirm creates new custom fields in workspace

## Phase 6 - Missing info + finish actions

Goal: make the workspace operational, not just visually rearranged.

### Task 5.1 - Missing information block
- **Location**: workspace main canvas
- derive and show missing info list from current facts/evidence
- keep it guidance, not a giant questionnaire
 - if time/scope tightens, defer this piece after core workspace + files + modal land

### Task 5.2 - Discovery complete action
- **Location**: workspace actions
- validate fixed base fields
- keep transition manual and explicit

Demo/validation:
- user sees what is missing
- `Discovery complete` explains blockers when not ready

## Reuse checklist

- `frontend/app/project/[id]/page.tsx`
- `frontend/components/features/projects/technical-data-sheet.tsx`
- `frontend/components/features/technical-data/components/data-capture/technical-data-summary.tsx`
- technical-data store autosave/edit patterns
- current file upload/browser pieces
- current notes/evidence lane pieces

## What not to do

- do not merge `Needs Confirmation` into workspace
- do not build a generic dynamic schema/form builder
- do not let AI proposal modal edit existing fields in v1
- do not make AI-created custom fields blocking in v1
- do not redesign intelligence/proposal flows in same first slice
- do not treat workspace note text as independent discovery source
- do not keep a separate body overview block if the same info already lives in the top header
- do not rebuild files; reframe and reuse them

## Testing strategy

- frontend check: `frontend/bun run check:ci`
- backend check: `backend/make check`
- manual smoke:
  - open persisted stream workspace
- verify top working header layout
  - edit base fields and autosave
  - upload evidence
  - see evidence status
  - open files integrated view and return to workspace
  - see AI proposal modal
  - confirm selected fields create new custom fields
  - cancel proposal batch leaves workspace unchanged

## Recommended first implementation slice

If building incrementally, do this first:

1. Phase 1 - workspace IA cut
2. Phase 2 - fixed base fields block
3. Phase 3 - evidence lane skeleton
4. Phase 4 - files integrated view

Then add the AI proposal modal in a second slice.

Reason:
- fastest path to visible progress
- reuses current code most heavily
- keeps AI proposal behavior isolated instead of mixing it into layout rewrite

## Open question

- whether `Discovery complete` belongs in top header actions or inside the main working canvas actions
