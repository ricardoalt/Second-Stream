# Discovery Wizard Unified Spec

Date: 2026-03-13
Scope: replace fragmented discovery entry UX with one wizard for file + audio + text intake

## Goal

Create one simple `Discovery Wizard` that lets user select `company`, add files, audio, and free text in one session, run AI extraction, then hand incomplete results into current draft/`Needs Confirmation` flow.

## Why

- today entry UX is fragmented across `PremiumProjectWizard`, bulk import, and voice upload
- backend already shares `import_runs` / `import_items`
- we need one simple intake surface without redesigning review/workspace yet

## Locked decisions

- one visible session = one discovery session
- inputs allowed in same session: files, audio, text
- `company` is selected manually by user for now
- AI detects `locations` and `waste streams` for v1
- incomplete or ambiguous detections stay as drafts and continue through current `Needs Confirmation`
- do not redesign workspace here
- do not replace bulk review / voice review internals here
- do not force current single-source `ImportRun` model to become mixed-source directly

## Product shape v1

Wizard states:

1. `idle`
   - company selector
   - file upload area
   - audio upload area
   - free-text input
   - one `Discover` CTA
2. `processing`
   - simple thinking/progress state
   - no per-source advanced progress UI in v1
3. `result`
   - count summary: locations found, waste streams found, contacts found
   - count of drafts needing confirmation
   - CTA to dashboard / `Needs Confirmation`

## UX rules

- keep surface simple; no detailed editing inside wizard
- text input is another source, not a special form flow
- user should see lightweight provenance only where useful
  - recommendation: source chips like `File`, `Audio`, `Text` in result summary and later draft review metadata
- wizard should feel modal/overlay first, not a new workspace
- if opened from company context, prefill company
- if opened globally, require company before `Discover`

## What unifies now

- entry UX
- company selection
- one session/run contract
- one submit action
- one processing state
- one result summary
- one handoff to current draft flows

## What stays separate behind the scenes

- file parsing path
- audio transcription/extraction path
- existing bulk review UI
- existing voice review UI
- finalize internals

## Minimal architecture

### Core recommendation

- add a new lightweight orchestration resource for the wizard, e.g. `DiscoverySession`
- user sees one session
- backend may fan out into one or more source-specific processing jobs behind the scenes
- do **not** contort current `ImportRun` schema to pretend one row owns mixed files + audio + text
- keep `ImportItem`-style staged detections and current draft pipeline as the canonical handoff target

### Frontend

- replace/absorb `frontend/components/features/dashboard/components/premium-project-wizard.tsx`
- new wizard shell with 3 source inputs: files, audio, text
- one client-side session model
- one submit path to discovery orchestration API
- result screen links user back to dashboard/current draft handling

### Backend

- add `DiscoverySession` as company-scoped orchestration unit
- add `DiscoverySource` (or equivalent child payload) for each file/audio/text input in session
- keep existing source-specific processing internals where possible:
  - document/file extraction path
  - voice interview/transcription path
- keep staged detection items as canonical handoff target for dashboard drafts
- add light provenance by source/unit so system knows whether evidence came from file, audio, or text

## Ownership and scope

- session belongs to one organization + one manually selected company
- no project is required up front
- one session can emit zero, one, or many staged draft entities
- dashboard remains the main place to review resulting drafts

## Recommended source model

- user sees one run
- system stores multiple source units inside that session
- each detected location/waste stream can keep internal provenance to one or more sources
- v1 UI should not expose full evidence browser; only simple source hints

## Async contract v1

Recommended flow:

1. `POST /discovery-sessions`
   - creates session with company context
2. attach sources
   - file upload source(s)
   - audio upload source(s)
   - text source(s)
3. `POST /discovery-sessions/{id}/start`
   - starts processing for all attached sources
4. `GET /discovery-sessions/{id}`
   - polling/status/result summary

Why:

- avoids one fragile mega-endpoint with mixed multipart + text + long audio semantics
- keeps retries/cancel/reopen simpler
- lets partial failures be handled cleanly

## Session statuses

- `draft`
- `uploading`
- `processing`
- `review_ready`
- `partial_failure`
- `failed`

V1 UX only needs to expose:

- `idle`
- `processing`
- `result`
- `error`

## Handoff rules

- fully usable detections can continue through current create/finalize path
- missing `location`, missing required stream fields, or ambiguous detections remain draft
- drafts appear in current dashboard `Needs Confirmation` flow
- do not create a second confirmation host just for discovery wizard

### Mapping rules v1

- company comes from manual wizard selection, not AI
- AI-detected locations create staged location entities/items
- AI-detected waste streams create staged project entities/items
- if a stream cannot be confidently tied to a location, it remains draft/orphan and still goes to current draft handling
- `needs_review=true` for incomplete, ambiguous, duplicate-prone, or low-confidence detections
- grouping should continue to follow current location/group concepts where possible

## Operational rules v1

- text input below minimum useful length should not process
- audio failure must not block file/text sources from completing
- one bad file must not fail whole session if other sources can still process
- limits must be explicit in contract:
  - max files per session
  - max file size
  - max audio size
  - max text length
- basic idempotency required for `start` action
- basic observability required: session id, source counts, failure reason

## Build order

### Phase 1 - contract
- define `DiscoverySession` / source-unit contract
- define async API lifecycle
- define minimal provenance fields
- define handoff mapping to current draft pipeline

### Phase 2 - backend orchestration
- create session + source + start/poll orchestration layer
- reuse bulk import + voice processing under orchestration layer
- support text input as first-class source

### Phase 3 - frontend wizard
- implement new wizard shell
- company selector + source inputs + processing + result summary
- open from navbar/dashboard/company context

### Phase 4 - handoff hardening
- ensure incomplete detections land cleanly in `Needs Confirmation`
- ensure dashboard CTAs/counters remain coherent
- add basic failure/retry states

## Non-goals

- no workspace redesign
- no new detailed review workspace inside wizard
- no company detection by AI
- no rich provenance explorer in v1
- no perfect source fusion/deduplication in v1
- no replacement of current voice/bulk review UIs yet

## Risks

- trying to also unify review/finalize UX now
- exposing too much provenance detail and bloating UX
- building a new data model instead of reusing `import_runs` / `import_items`
- letting wizard create hidden business rules that diverge from `Needs Confirmation`

## Acceptance criteria

- one wizard can accept files + audio + text in one session
- company is manual and required
- one session produces one run
- one visible session produces one coherent result summary
- AI outputs still land in current draft pipeline
- incomplete results appear in `Needs Confirmation`
- wizard does not introduce a second review workspace

## Likely files

- `frontend/components/features/dashboard/components/premium-project-wizard.tsx`
- `frontend/components/shared/layout/navbar.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/companies/[id]/page.tsx`
- `frontend/lib/api/bulk-import.ts`
- `frontend/lib/api/voice-interviews.ts`
- `backend/app/api/v1/bulk_import.py`
- `backend/app/api/v1/voice_interviews.py`
- `backend/app/api/v1/discovery_sessions.py`
- `backend/app/services/bulk_import_service.py`
- `backend/app/services/discovery_session_service.py`
- `backend/app/models/bulk_import.py`

## Recommendation on source visibility

- keep user-facing provenance minimal in v1
- recommendation: show only small source chips in result summary and later draft metadata
- do not build per-file extraction explorer yet

## Unresolved questions

- should v1 result screen show simple source chips per detected entity, or only run-level counts?
