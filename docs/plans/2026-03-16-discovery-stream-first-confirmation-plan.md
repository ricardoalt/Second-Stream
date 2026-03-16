# Plan: Discovery stream-first confirmation

**Generated**: 2026-03-16
**Complexity**: Medium

## Overview

Goal: make `Needs Confirmation` stream-first.

- 1 visible row = 1 waste-stream draft = 1 confirmable unit
- location stays prefill/context only
- sheet fields become plain editable inputs; no per-field confirm/reject controls
- sheet keeps only 2 top-level actions: `Confirm draft` and `Reject draft`
- discovery confirmation stops depending on sibling streams sharing one `group_id`
- fix sheet autofocus bug in same work

Recommended scope now:

- cut over **Discovery / Needs Confirmation only**
- keep legacy group-first finalize semantics for voice + legacy bulk-import for now
- reason: discovery UI is row-first today; voice workspace is intentionally group-first, so broad cutover now adds risk w/o user value

## Phase 1 - stop current UX breakage

Goal: remove obvious broken behavior before semantic cutover lands.

### Task 1.1 - Fix sheet autofocus loop
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
- run autofocus once per sheet open / draft change, not on every `contract` update
- target first editable missing required field only
- verify typing no longer jumps after first character

### Task 1.2 - Simplify sheet field interactions
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
- remove per-field `Confirm / Reject` buttons
- remove per-field decision state from discovery sheet flow
- keep source badge / required / validation states only
- field behavior becomes:
  - keep value => use it
  - edit value => use edited value
  - clear value => empty

### Task 1.3 - Add regression coverage for sheet input behavior
- **Location**: frontend test file near `draft-confirmation-sheet.tsx`
- cover: typing in input, typing in textarea, focus stays put
- cover: no per-field decision controls rendered

Demo/validation:
- open one draft
- type multiple chars in `material name`, `composition`, `frequency`
- cursor stays in field
- no field-level confirm/reject buttons remain

## Phase 2 - cut discovery confirmation to item-first semantics

Goal: make one stream independently confirmable/rejectable.

### Task 2.1 - Add dedicated discovery draft decision endpoint
- **Location**: `backend/app/api/v1/bulk_import.py`, `backend/app/services/bulk_import_service.py`, related schemas
- add one item-first endpoint for discovery sheet actions
- request identifies one project draft item and one top-level action:
  - `confirm`
  - `reject`
- confirm payload includes edited stream fields + location resolution when needed
- backend performs the whole decision transactionally instead of frontend chaining `patchItem` + `finalize`

### Task 2.2 - Make run completion item-based for discovery path
- treat project drafts as canonical confirmable units
- rejected stream counts as resolved
- run remains reviewable while confirmable project items stay pending
- run completes when no confirmable project items remain pending

### Task 2.3 - Preserve linked location behavior without sibling coupling
- linked location data still used as prefill/context
- confirming one stream may reuse/create location as needed
- sibling streams under same detected location must not block each other
- location-only stays hidden and non-blocking

Demo/validation:
- 5 linked streams under one detected location
- confirm 1, reject 4
- each action independent
- no `Requested groups are unresolved`
- draft-level reject discards row without creating a stream

## Phase 3 - align dashboard + sheet to item-first backend

Goal: remove split-brain between row UI and backend semantics.

### Task 3.1 - Submit draft-level actions by project item id
- **Location**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
- stop finalizing via shared `groupId`
- stop using per-field decision model
- wire footer actions only:
  - `Confirm draft`
  - `Reject draft`
- submit row edits against one project draft
- keep location edit UX as-is where possible

### Task 3.2 - Keep dashboard row model unchanged
- **Location**: `backend/app/api/v1/projects.py`, dashboard types if needed
- dashboard remains stream-row based
- no new group UI in discovery
- no secondary location-only UI

Demo/validation:
- linked row confirms alone
- orphan row confirms after location select/create
- rejected row disappears from pending queue and does not block run completion
- required empty fields still block confirm, but not reject

## Phase 4 - tests + cleanup

Goal: lock semantics, avoid reintroducing group coupling.

### Task 4.1 - Backend tests
- **Location**: `backend/tests/test_bulk_import.py`, `backend/tests/test_projects.py`, discovery tests as needed
- add/update cases:
  - confirm one linked stream while sibling linked stream stays pending
  - reject one linked stream, confirm another later
  - orphan stream requires location resolution
  - run completion uses pending project items, not group completeness

### Task 4.2 - Frontend tests
- **Location**: dashboard confirmation sheet tests
- cover:
  - no autofocus jump
  - no field-level confirm/reject controls
  - confirm submits item-first payload
  - reject submits item-first payload
  - linked sibling drafts do not trigger group-unresolved error path

### Task 4.3 - remove stale discovery group assumptions
- remove only touched discovery-only group-first assumptions
- keep voice/group workspace intact
- update docs touched by contract change

Demo/validation:
- `backend/make check`
- `frontend/bun run check:ci`
- manual smoke: file discovery w/ multi-stream same location

## What not to do

- do not hack backend to ignore unresolved siblings inside group finalize
- do not invent per-stream fake `group_id` as new canonical model
- do not force discovery into group-review UI
- do not broaden cutover to voice workspace now
- do not remove backend ability to represent linked location provenance
- do not keep field-level decision state if simple input state already expresses intent

## Why not cut over all bulk-import now

- voice workspace is already intentionally group-first
- legacy bulk-import screens still reason in groups/locations
- broad cutover would touch more UI, summary, idempotency, finalize flows at once
- discovery pain is urgent and row-first; solve that directly first

## Later follow-up

- if item-first semantics prove right, unify other flows later
- at that point, either:
  - migrate voice/bulk-import to item-first too, or
  - keep them explicitly group-first as separate workflow types

## Unresolved questions

- After discovery cutover, do we want a later repo-wide simplification pass to retire group-first finalize outside voice?
