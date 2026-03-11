# Workspace Phased Spec

Date: 2026-03-10
Scope: detailed views behind dashboard buckets
Approach: build one phase at a time, start with `Needs Confirmation`

## Goal

Replace the old content-type workspace model with a state-driven flow:
- `Needs Confirmation`
- `Missing Information`
- `Intelligence Report`
- `Proposal`

Do not redesign dashboard again.
Do not rename core backend `project` domain in phase 1.

## Locked decisions

- `Needs Confirmation` = modal/drawer, not full page
- draft becomes persisted stream as soon as base fields are confirmed
- rejected field can be manually edited in the modal; if not resolved, it becomes a gap in `Missing Information`
- persisted streams use one shared workspace shell
- workspace modes:
  - `missing_information`
  - `intelligence_report`
  - `proposal`
- route model for persisted streams:
  - `/project/[id]?mode=missing_information`
  - `/project/[id]?mode=intelligence_report`
  - `/project/[id]?mode=proposal`
- `Intelligence Report` is manually triggered by user
- `Discovery complete` is manual user action
- latest proposal is the primary one shown in Proposal mode
- if stream state changes while user is inside workspace, stay in current mode and show banner
- `Contacts` / `Files` in detail views are light local toggles, not heavy nested tabs

## Phase 1 - Needs Confirmation

### Purpose

Fast adjudication of AI-detected draft data before a waste stream becomes persisted.

### UX model

- launched from dashboard `Needs Confirmation`
- opens as modal/drawer over current flow
- uses current bulk/voice review logic where possible
- user can confirm, reject, or manually edit each field

### Fields in scope

- company
- location
- material type
- material name
- composition
- volume
- frequency
- primary contact

### Rules

- if AI found company/location, prefill it
- if AI did not find them, show `Pending`
- company selector must support existing company or add/select flow later
- all fields are editable
- confirm action requires base fields needed to create persisted stream:
  - company
  - location
  - material name or material type
  - volume
  - frequency
- after confirm:
  - create persisted stream
  - close modal/drawer
  - rebucket to `Missing Information` or `Intelligence Report`
  - default to `Missing Information` unless no required gaps remain

### Deliverables

1. confirmation modal/drawer UI
2. field-level confirm/reject/edit behavior
3. creation path from confirmed draft -> persisted project
4. rebucketing back into dashboard

### Files likely touched

- `frontend/components/features/dashboard/components/draft-queue-table.tsx`
- `frontend/components/features/dashboard/components/draft-preview-rail.tsx`
- new confirmation modal/drawer component(s)
- `frontend/lib/routes.ts`
- `frontend/lib/types/dashboard.ts`
- bulk/voice review frontend pieces
- bulk/voice import backend mutation path(s)

### Acceptance criteria

- user can open a draft from `Needs Confirmation`
- user can edit all base fields in one place
- AI-found location/company display correctly
- missing location/company show `Pending`
- confirm creates persisted stream
- stream lands in correct next bucket

## Phase 2 - Shared Workspace Shell

### Purpose

Create one persisted-stream shell that changes by state instead of old `Overview / Questionnaire / Files / Proposals` tabs.

### UX model

- keep `/project/[id]`
- add `?mode=` routing
- shared header:
  - stream name
  - company
  - location
  - owner
  - current state
  - top action(s)
- optional side panel toggle for `Contacts` / `Files`

### Deliverables

1. shell layout
2. mode routing + deep links from dashboard
3. backward-compatible handling for legacy `?tab=` during transition
4. banner system for “you can advance now” without auto-kicking user

### Files likely touched

- `frontend/app/project/[id]/page.tsx`
- `frontend/components/features/projects/project-tabs.tsx`
- `frontend/lib/routes.ts`
- project/workspace shell components

### Acceptance criteria

- dashboard rows deep-link into correct mode
- shell can render all persisted-stream modes
- old tab mental model is no longer primary

## Phase 3 - Missing Information Mode

### Purpose

Guide users to fill the minimum missing data and supporting evidence.

### UX model

- summary block
- current facts block
- missing items block
- upload evidence block
- free-text notes block
- `Discovery complete` CTA
- `Contacts` / `Files` shown as light panel toggle

### Rules

- this is not a giant questionnaire
- show what is missing and why it matters
- show what already exists
- if user rejected data in confirmation and did not replace it, it appears here as a gap
- `Discovery complete` runs validation, does not blindly advance
- if backend state changes while user is inside this mode, keep current mode and show a banner; do not auto-redirect

### Acceptance criteria

- user can see missing items clearly
- user can upload evidence and notes in context
- user can trigger `Discovery complete`
- if gates fail, UI explains why

## Phase 4 - Intelligence Report Mode

### Purpose

Let user manually generate and review an intelligence snapshot derived from current stream data.

### UX model

- summary
- insights/findings
- recommendations / next steps
- proposal upload area
- files toggle/panel

### Rules

- generation is manual, user-triggered
- snapshot is derived from current stream data
- not a versioned artifact in phase 1
- user decides when to move into proposal work

### Acceptance criteria

- user can trigger report generation
- user can review snapshot in workspace mode
- user can upload proposal from here

## Phase 5 - Proposal Mode

### Purpose

Operational commercial workspace around the latest proposal.

### UX model

- stream info block
- intelligence snapshot reference block
- latest proposal block
- status control
- files block
- notes block

### Rules

- latest proposal is primary in this view
- commercial status editing is stream-level follow-up
- current proposal detail page remains deeper detail page

### Acceptance criteria

- user can manage commercial follow-up here
- user can still open deeper proposal detail
- notes/files/status are all usable in one screen

## Backend/data prerequisites

Need before or during implementation:
- normalized confirmation payload for draft fields
- creation path from draft -> persisted project
- explicit missing-items source for Missing Information mode
- manual trigger endpoint/service for Intelligence Report snapshot
- latest-proposal selection rule exposed cleanly
- contact data shape if shown in side panel

## Reuse vs replace

### Reuse

- autosave + editable field patterns from `technical-data-sheet`
- file upload/browser infrastructure
- bulk/voice draft review logic where possible
- proposal detail page as deeper route

### Replace / demote

- `ProjectTabs` as primary IA
- `% complete` / questionnaire-first framing
- `Overview` as default landing mode

## Risks

- trying to fake this as a tab rename will create incoherent UX
- mixing draft confirmation with persisted workspace will blur domain boundaries
- not locking route/state rules early will create fragile deep links
- proposal version status and commercial follow-up can drift again if mixed

## Recommended build order

1. Phase 1 - Needs Confirmation
2. Phase 2 - Shared Workspace Shell
3. Phase 3 - Missing Information
4. Phase 4 - Intelligence Report
5. Phase 5 - Proposal

## Unresolved questions

- exact validation rules behind `Discovery complete`
- exact manual trigger UX for Intelligence Report generation
