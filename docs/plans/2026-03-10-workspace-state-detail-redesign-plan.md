# Workspace State Detail Redesign Plan

Date: 2026-03-10
Scope: detailed views behind dashboard buckets
Out of scope: dashboard redesign, broad compliance/pricing platform rewrite

## Overview

Move from data-type tabs (`overview`, `technical`, `files`, `proposals`) to a workflow-driven detail model:

- `Needs Confirmation` = fast modal/drawer over the queue for draft/unconfirmed items
- persisted waste streams use one shared workspace shell
- workspace modes:
  - `Missing Information`
  - `Intelligence Report`
  - `Proposal`

Locked decisions:
- `Needs Confirmation` opens as modal/drawer
- draft becomes persisted stream as soon as base fields are confirmed
- persisted streams use one workspace shell with state-driven modes
- `Intelligence Report` is a derived snapshot, not a versioned artifact
- `Proposal` detail is an operational layer above current proposal detail page
- `Contacts` / `Files` in detail views behave as local panel toggles, not heavy nested tabs
- phase 1 keeps existing `project` ids/routes/store naming; this is IA/workspace redesign, not domain rename

## Phase 0 - Route + state checkpoint

Before UI implementation, lock 2 things:

### Route model
- keep `/project/[id]` as canonical persisted-stream workspace route
- use query param or routed mode to open exact workspace state:
  - `?mode=missing_information`
  - `?mode=intelligence_report`
  - `?mode=proposal`
- current legacy `?tab=` behavior must remain backward-compatible during transition
- dashboard deep-links must open the matching workspace mode directly

### State machine
- `Needs Confirmation` -> draft/unconfirmed only
- persisted stream modes:
  - `Missing Information`
  - `Intelligence Report`
  - `Proposal`
- source of truth for persisted stream mode should stay derived from stream data + proposal follow-up state
- explicit transitions to define before build:
  - confirm base fields -> `Missing Information` or `Intelligence Report`
  - missing data resolved -> `Intelligence Report`
  - proposal uploaded -> `Proposal`
  - proposal removed with no remaining proposal -> fall back out of `Proposal`

## IA target

### A. Draft confirmation flow

For dashboard `Needs Confirmation` items:
- open modal/drawer, not full page
- confirm or amend:
  - company
  - location
  - material type / material name
  - composition
  - volume
  - frequency
  - primary contact
- show AI-detected values and allow human correction
- confirm action persists a new waste stream when base fields are valid
- phase 1 should reuse/replace the current company-based confirmation flow intentionally, not accidentally
- after confirm, route item into next state:
  - `Missing Information`
  - or `Intelligence Report`

### B. Persisted stream workspace shell

Replace current project-tab mental model with one shell that changes by state.

Shared shell:
- top header with stream name, client, location, state, owner
- state-local actions
- optional secondary panel toggle for `Contacts` / `Files`

Modes:
- `Missing Information`
- `Intelligence Report`
- `Proposal`

## Mode definitions

### 1. Missing Information

Purpose:
- complete the minimum missing data and supporting evidence

Core layout:
- summary block
- primary facts block
- missing items block
- evidence upload block
- free-text note block
- completion CTA

Must answer:
- what is missing
- why it matters
- what data already exists
- what file/note/upload can unblock it

### 2. Intelligence Report

Purpose:
- review a derived intelligence snapshot built from the collected stream data

Core layout:
- summary block
- insights / findings block
- recommendation or next-step block
- proposal upload block
- files toggle/panel

Rules:
- snapshot is derived from current stream data
- not a separate versioned artifact in phase 1
- user can use this state to decide whether to move into proposal work

### 3. Proposal

Purpose:
- operational commercial follow-up around an uploaded proposal

Core layout:
- stream summary block
- current commercial status control
- intelligence snapshot reference block
- uploaded proposal block
- files list
- notes block

Rules:
- this sits above current proposal detail page
- current proposal detail page remains deeper detail route
- status editing here is stream-level commercial follow-up, not proposal version lifecycle

## Current code reuse

Keep/reuse:
- `frontend/components/features/technical-data/components/data-capture/resizable-data-layout.tsx`
- `frontend/components/features/projects/technical-data-sheet.tsx` internals where useful
- file upload/browser pieces from current project/files flow
- proposal detail route pattern in `frontend/app/project/[id]/proposals/[proposalId]/page.tsx`
- dashboard bucket routing as top-level entrypoint

Replace or heavily refactor:
- `frontend/components/features/projects/project-tabs.tsx`
- current project workspace header framing
- `% complete` / questionnaire-first messaging
- current `overview` as primary entrypoint

## Sprint 1 - Confirmation flow

Goal: make `Needs Confirmation` actionable and consistent with bulk/voice orphan review.

### Task 1.1 - map draft confirmation contract
- **Location**: `frontend/lib/types/dashboard.ts`, bulk-import/voice types
- **Description**: define exact fields shown in modal/drawer and normalized save payload
- **Dependencies**: existing draft target payload
- **Acceptance Criteria**:
  - same base fields shown regardless of source
  - clear `Pending` fallbacks
- **Validation**:
  - verify both bulk import and voice review drafts can populate the UI

### Task 1.2 - build confirmation modal/drawer
- **Location**: new dashboard/workspace confirmation components
- **Description**: create modal/drawer opened from `Needs Confirmation` queue and draft rail
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - user can edit/confirm base fields
  - confirm/reject actions are explicit
  - relationship to current `/companies/:companyId` confirmation flow is explicit: replace, embed, or wrap
- **Validation**:
  - manual flow from queue row to save works

### Task 1.3 - persist confirmed draft as waste stream
- **Location**: backend bulk/voice import endpoints + frontend mutation wiring
- **Description**: on confirm, create/update persisted stream and rebucket it
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - confirmed item disappears from queue
  - new persisted stream appears in next correct bucket
- **Validation**:
  - end-to-end manual test for both source types

## Sprint 2 - Workspace shell

Goal: replace current tab-first project page with one shared shell for persisted stream modes.

### Task 2.1 - define routed workspace shell
- **Location**: `frontend/app/project/[id]/page.tsx`, `frontend/lib/routes.ts`
- **Description**: decide and implement mode selection driven by dashboard state or query param
- **Description**: implement canonical `/project/[id]?mode=...` routing while keeping legacy `?tab=` links compatible during transition
- **Dependencies**: none
- **Acceptance Criteria**:
  - shell can open directly into `missing_information`, `intelligence_report`, or `proposal`
- **Validation**:
  - deep links from dashboard open correct mode

### Task 2.2 - replace `ProjectTabs` top-level role
- **Location**: `frontend/components/features/projects/project-tabs.tsx`
- **Description**: demote/remove current data-type tabs as primary IA
- **Dependencies**: Task 2.1 and at least one shipped replacement mode
- **Acceptance Criteria**:
  - state-driven shell is primary, not overview/questionnaire/proposals tabs
- **Validation**:
  - project page no longer defaults to old tab mental model

## Sprint 3 - Missing Information mode

Goal: deliver the first persisted-stream detail mode.

### Task 3.1 - summary + facts + missing-items layout
- **Location**: new workspace mode component(s)
- **Description**: build summary, current facts, missing-items list, evidence area, notes, completion CTA
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - mode explains what is missing and where to add it
- **Validation**:
  - compare with wireframe using populated sample stream

### Task 3.2 - contacts/files side toggle
- **Location**: workspace shell / right-side panel
- **Description**: add light toggles for `Contacts` and `Files`
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - panel switches without nested mini-IA complexity
- **Validation**:
  - mobile + desktop toggle behavior works

## Sprint 4 - Intelligence Report mode

Goal: make intelligence a first-class persisted-stream workspace state.

### Task 4.1 - derived intelligence snapshot view
- **Location**: new workspace intelligence mode component(s)
- **Description**: build summary + insights + recommended next steps from current stream data
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - feels like a review screen, not a generic project tab
- **Validation**:
  - compare against wireframe with real sample data

### Task 4.2 - proposal upload handoff
- **Location**: intelligence mode + file/proposal upload pieces
- **Description**: allow proposal upload entry from Intelligence mode
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - user can move from insights review into proposal work without leaving shell
- **Validation**:
  - upload path works and stream enters Proposal mode

## Sprint 5 - Proposal mode

Goal: create operational proposal workspace above current deep proposal page.

### Task 5.1 - proposal operations detail
- **Location**: new proposal mode component(s)
- **Description**: combine stream info, intelligence snapshot reference, uploaded proposal, files, notes, status control
- **Dependencies**: Sprint 2, Sprint 4
- **Acceptance Criteria**:
  - commercial follow-up is editable here
  - current proposal detail remains deeper route when needed
  - active proposal selection rule is explicit when several proposal versions exist
- **Validation**:
  - state changes, files, notes, and deep-link to proposal detail all work

## Backend/data prerequisites

Need explicit agreement before implementation for:
- confirmed-draft -> persisted-stream creation path
- field-level confirmation payload and provenance
- contact data shape
- file panel scoping by workspace mode
- derived intelligence snapshot data source
- proposal upload metadata if not already exposed cleanly
- active proposal selection rule when multiple proposals exist

## Testing strategy

- Draft confirmation from dashboard queue
- Draft confirmation from mobile queue
- Dashboard deep-link to each persisted-stream mode
- Missing Information completion path
- Intelligence review -> proposal upload handoff
- Proposal status change inside workspace shell
- Desktop/mobile validation for all four flows

## Risks

- forcing all states into current `ProjectTabs` will create incoherent UX
- mixing draft confirmation and persisted-stream workspace will blur domain boundaries
- `% complete` logic may leak back into readiness if not explicitly removed
- proposal version status vs commercial follow-up status can become confused again

## Recommendation

Plan implementation as two tracks inside one spec:
- draft confirmation flow
- persisted-stream workspace shell

Do not attempt a pure tab rename.
