# Discovery Draft-First Handoff Spec

Date: 2026-03-14
Scope: align Discovery Wizard outputs with `Needs Confirmation`

## Goal

All AI output from Discovery Wizard (`file`, `audio`, `text`) must enter the system as draft first. Nothing becomes a real location or waste stream until a human confirms it in `Needs Confirmation`.

## Product rule

- every AI-detected waste stream starts as draft
- every AI-detected location starts as draft
- AI should still link streams to locations when possible
- if a stream cannot be linked to a location, it stays as an orphan draft
- if a location is detected without a stream, it stays as a location-only draft
- `invalid` is only for truly unusable/corrupt rows, not for missing relationships

## Current mismatch

- company-entrypoint bulk path marks stream-without-location as `invalid`
- dashboard `Needs Confirmation` excludes `invalid`
- file/text imports do not produce grouping semantics the confirmation UI expects
- voice has orphan handling; file/text do not
- discovery summary counts only a subset of actionable drafts

## Target semantics

### Draft types

1. linked draft
   - location draft + waste stream draft already related
2. orphan stream draft
   - waste stream draft with no resolved location
3. location-only draft
   - location draft with no linked waste stream yet

All three must remain visible to user before confirmation.

### Canonical draft kind contract

Backend/frontend should expose one explicit discriminator:

- `draft_kind = linked | orphan_stream | location_only`

Recommended minimum fields by kind:

- `linked`
  - `group_id`
  - location draft item
  - one or more stream draft items
- `orphan_stream`
  - `group_id`
  - stream draft item
  - optional location hints / candidate refs
- `location_only`
  - `group_id`
  - location draft item
  - no stream draft item yet

### Confirmation rule

- confirmation remains the only moment a draft becomes a real entity
- discovery wizard never creates real locations/projects directly
- `Needs Confirmation` is the single human gate for all discovery outputs

V1 confirmation behavior:

- `linked`: confirmable in normal flow
- `orphan_stream`: visible immediately, but cannot finalize until user resolves location in confirmation sheet
- `location_only`: visible in queue, but not confirmable in v1; informational/secondary only

## Minimal backend changes

### 1. Stop using `invalid` for missing location context

In company-entrypoint item building, a project without resolved location context should become a visible draft, not `invalid`.

Implication:

- replace `status="invalid"` + `needs_review=false` for missing-linkage cases
- use draft/actionable semantics instead:
  - `status="pending_review"`
  - `needs_review=true`
  - `review_notes` explaining missing location linkage

### 2. Normalize grouping for all discovery sources

`Needs Confirmation` should not depend on source type for grouping behavior.

Required:

- linked stream/location pair gets stable `group_id`
- orphan stream gets stable `group_id` too
- location-only draft gets stable `group_id` or equivalent visible identifier
- file/text should behave consistently with voice enough for the queue to render and confirm them

Concrete v1 rules:

- one detected location + its linked streams share one `group_id`
- each orphan stream gets its own `group_id`
- each location-only draft gets its own `group_id`
- `group_id` only needs to be stable within a run/session, not across reimports

### 3. Expose all actionable drafts to dashboard queue

Dashboard `Needs Confirmation` queries and summary logic must count/show:

- linked stream drafts
- orphan stream drafts
- location-only drafts

Do not hide drafts only because relationship resolution is incomplete.

V1 rendering split:

- main queue: `linked` + `orphan_stream`
- secondary section: `location_only`

### 4. Tighten meaning of `invalid`

Reserve `invalid` for:

- corrupt parser output
- impossible payloads
- rows rejected by hard validation rules

Not for “stream exists but location is unknown”.

## Minimal frontend changes

### 1. `Needs Confirmation` queue supports three visible states

- linked draft
- orphan stream
- location-only draft

V1 can stay simple. The queue does not need a new workspace.

Recommended v1 UX:

- main list rows stay stream-first
- linked rows show proposed location context
- orphan rows show `No location linked yet`
- secondary section below main list shows `Detected locations without linked streams`

### 2. Reuse voice orphan pattern

Use current voice orphan UX as baseline instead of inventing a second model for file/text.

### 3. Confirmation sheet must handle non-perfect groups

Current sheet assumes `projectItem.groupId` always exists. That assumption must be relaxed or guaranteed by backend grouping.

Recommendation: guarantee grouping in backend so UI stays simpler.

V1 rule:

- orphan stream opens the same sheet
- user must select/create/confirm location before finalize succeeds
- location-only draft does not open full confirm flow yet

### 4. Location-only drafts in v1

Recommended v1 behavior:

- show them in `Needs Confirmation`
- but as lightweight secondary rows/section, not the main happy-path row type
- goal: visibility first, sophisticated association later
- no standalone finalize action yet

## Summary/result changes

Discovery result summary should count actionable review items, not only currently linked project drafts.

At minimum expose:

- locations found
- waste streams found
- drafts needing confirmation
- optional future split:
  - linked drafts
  - orphan streams
  - location-only drafts

V1 rule for `drafts needing confirmation`:

- count `linked` + `orphan_stream`
- do not count `location_only` in the primary confirm CTA until that flow exists

## Build order

### Phase 1 - backend semantics

- stop marking missing-linkage streams as `invalid`
- make them actionable drafts
- keep relation hints in `review_notes` / metadata

### Phase 2 - grouping contract

- normalize `group_id` generation for file/text/audio
- ensure draft confirmation can load every discovery draft safely

### Phase 3 - dashboard queue + counts

- update `Needs Confirmation` queries
- update discovery summary counts
- ensure actionable drafts appear in queue
- add secondary rendering for `location_only`

### Phase 4 - UI states

- render linked, orphan, and location-only drafts clearly
- reuse voice orphan concepts where possible

### Phase 5 - tests

- file with linked stream/location
- file with orphan streams
- file with location-only drafts
- mixed linked + orphan in same session
- truly invalid rows still excluded appropriately
- orphan stream cannot finalize until location is resolved

## Acceptance criteria

- all discovery outputs are draft-first
- no discovery stream is hidden from review only because location linkage is missing
- AI-linked stream/location pairs stay grouped when possible
- orphan streams are visible in `Needs Confirmation`
- location-only detections are visible in `Needs Confirmation`
- orphan streams require location resolution before finalize
- `invalid` is used only for truly unusable rows

## Biggest scope traps

- building complex matching UI now
- inventing separate review models for voice vs file/text
- solving full association workflows for location-only drafts in v1
- patching summary counts without fixing handoff semantics

## Recommended v1 simplification

- backend guarantees draft visibility + grouping
- dashboard queue shows all actionable drafts
- orphan streams get simple “no location linked yet” treatment
- location-only drafts are visible but secondary and not confirmable yet
- association refinement can come later

## Likely files

- `backend/app/services/bulk_import_service.py`
- `backend/app/services/discovery_session_service.py`
- `backend/app/api/v1/projects.py`
- `backend/tests/test_discovery_sessions.py`
- `backend/tests/test_bulk_import.py`
- `frontend/components/features/dashboard/components/draft-queue-table.tsx`
- `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`
- `frontend/components/features/voice-interview/voice-review-workspace.tsx`
- `frontend/lib/types/dashboard.ts`

## Unresolved questions

- none; recommended v1: `location_only` visible but not confirmable, `orphan_stream` confirmable only after location resolution
