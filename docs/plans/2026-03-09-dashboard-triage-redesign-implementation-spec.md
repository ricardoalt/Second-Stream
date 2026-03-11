# Dashboard Triage Redesign - Implementation Spec

Date: 2026-03-09
Status: proposed
Scope: dashboard only
Out of scope: workspace UI redesign

## 1. Goal

Redesign the main dashboard into a triage + quick-action surface.

Dashboard must answer:
- what needs attention now
- what is missing
- what is ready for insights
- what proposals are already in commercial follow-up

Dashboard must not become the waste-stream workspace.

## 2. Locked product decisions

- Dashboard = triage, visibility, quick actions
- Workspace = deep edit, confirmation, files, notes, proposal upload
- `Intelligence Report` includes streams that are sufficiently complete, not only 100%
- `Needs confirmation`, `Missing information`, `Intelligence Report` = derived dashboard buckets
- `Needs confirmation` includes real pre-project drafts coming from bulk import / voice review staging
- `Proposal` = persisted commercial follow-up state
- proposal commercial follow-up is tracked per waste stream, not per proposal version
- persisted-stream rows navigate into workspace; draft rows navigate into a confirmation flow entrypoint
- dashboard must stay host-agnostic for confirmation flow so bulk import / voice review can later move into `Discovery Wizard`

## 3. Target IA

Primary buckets:
- `Total Waste Streams`
- `Needs confirmation`
- `Missing information`
- `Intelligence Report`
- `Proposal`

Behavior:
- one primary list/table in center
- search on top
- bucket tabs switch list content
- persisted-stream row click opens workspace
- draft row click opens confirmation flow entrypoint
- optional light drawer/preview for quick context only
- archived filter remains
- company filter remains unless product removes it explicitly
- drafts without company assignment are hidden when a company filter is active and only appear in global view
- primary create-stream CTA remains in dashboard header
- proposal quick action links to workspace proposal tab; no dashboard-side mutation in this phase

Dashboard layout by bucket:
- `Total Waste Streams`: primary confirmed-stream table + secondary right rail for draft preview
- `Needs confirmation`: full-width primary queue of unconfirmed/draft streams
- `Missing information`: primary table of confirmed streams with required gaps
- `Intelligence Report`: primary table of sufficiently complete streams ready for insight review
- `Proposal`: primary table of streams in commercial follow-up + proposal subfilters

Recommended row fields:
- waste stream name
- company / location
- volume
- last activity / aging
- top blocker or next action
- bucket-specific status chip

Draft preview card fields in `Total Waste Streams` right rail:
- detected stream name
- source
- missing assignment summary
- CTA: `Review draft` or `Confirm`

`Needs confirmation` table fields:
- waste stream name
- client / location
- volume / frequency
- source
- owner when relevant
- confidence or urgency if available

Missing values show `Pending`.

## 4. State model

### 4.0 Entity sources

Dashboard is backed by two different source types:

- persisted waste streams from `Project`
- pre-confirmation draft items from bulk import / voice review staging

Important:
- `Needs confirmation` is not `Project`-only
- dashboard must not hardcode navigation to the current company-page review host
- use a neutral confirmation-flow target so the same dashboard can later point to `Discovery Wizard`

### 4.0.1 Dashboard row model

Dashboard UI/API should use a discriminated row model.

Recommended row kinds:
- `persisted_stream`
- `draft_item`

Why:
- row fields differ across persisted streams vs staging drafts
- navigation targets differ
- filtering rules differ
- this prevents hidden branching logic in table components

### 4.1 Derived dashboard buckets

Do not persist these as canonical stream status.

Suggested derivation rules:

`Needs confirmation`
- includes pre-project drafts from bulk import / voice review staging
- includes AI/system-detected facts pending human confirmation
- missing company/location from detected data can count here if confirmation required
- this bucket is the full operational queue for drafts/unconfirmed streams

`Missing information`
- no critical confirmation pending
- stream still misses required discovery inputs
- not yet sufficiently complete for intelligence report

`Intelligence Report`
- stream passes readiness threshold
- enough data for insight generation/review
- no proposal commercial follow-up started yet

`Proposal`
- manual proposal uploaded in workspace
- stream now tracked in commercial follow-up

`Total Waste Streams`
- union of all active streams above

Rules:
- all bucket counts/lists respect archived filter
- archived streams excluded by default
- derivation must use explicit dashboard projection fields for confirmation, gaps, readiness, and proposal follow-up
- do not infer these buckets from legacy `project.status` names alone
- draft preview rail appears only in `Total Waste Streams`
- clicking a draft from rail goes directly to the confirmation flow entrypoint
- clicking a row in `Needs confirmation` also goes directly to the confirmation flow entrypoint
- once confirmed, draft leaves `Needs confirmation` and enters its next derived bucket
- company filter hides pre-project drafts that are not yet assigned to a company; those drafts appear only in global dashboard view
- archived filter applies to persisted streams; staging drafts do not participate in archived views
- search only applies to rows visible after bucket/company/archive scoping

### 4.2 Persisted proposal commercial state

Persist only real business states:
- `uploaded`
- `waiting_to_send`
- `waiting_response`
- `under_negotiation`
- `accepted`
- `rejected`

Notes:
- `uploaded` separates document exists vs sent externally
- this state is not document version status
- every transition should be auditable
- transition should create timeline event
- notification delivery is follow-up work after a concrete channel/owner is defined

## 5. UX requirements

- no hero block as center of gravity
- no generic SaaS stats wall
- no questionnaire editing inside dashboard
- no mixed semantics between readiness buckets and proposal commercial state
- `Intelligence Report` bucket should feel like “ready to review insights now”
- `Proposal` bucket should support subfilters: waiting to send, waiting response, accepted, under negotiation, rejected
- `Total Waste Streams` should show draft preview as secondary context, not as the main focus
- `Needs confirmation` should promote drafts/unconfirmed items to the primary queue
- dashboard must not expose current bulk import / voice review hosting details in product copy
- mobile keeps same IA, stacked vertically

## 6. Frontend implementation plan

### Sprint 1 - IA + shell rewrite

Goal: replace current dashboard composition with new triage shell.

Files:
- `frontend/app/dashboard/page.tsx`
- new dashboard-specific components under `frontend/components/features/dashboard/components/`

Tasks:
- remove current hero/pipeline-first composition from `frontend/app/dashboard/page.tsx`
- build new dashboard header with search + bucket tabs
- create new dashboard-specific row/list components; do not retrofit old `project-card` semantics
- build draft preview right rail for `Total Waste Streams`
- build full `Needs confirmation` queue view for unconfirmed streams
- keep current visual system where possible; avoid new one-off styling patterns
- remove old blocks that depend on outdated semantics: average progress, featured stream, pipeline funnel

Validation:
- desktop + mobile render correctly
- bucket switching works with mock/current data
- persisted-stream row click goes to workspace route
- draft rail CTA opens confirmation flow entrypoint directly

### Sprint 2 - derived bucket logic in frontend/store

Goal: consume explicit dashboard projection data and derive only lightweight UI grouping on frontend.

Files:
- `frontend/lib/project-types.ts`
- `frontend/lib/project-status.ts`
- `frontend/lib/stores/project-store.ts`
- new dashboard-specific helpers/types if needed in `frontend/lib/`

Tasks:
- add dashboard bucket and proposal commercial-state types
- add mapper/helpers that derive display bucket from explicit dashboard projection fields
- keep old project status enum unchanged; dashboard bucket is separate
- do not derive confirmation/missing-info/readiness from legacy project status enum alone
- define readiness threshold helper for `Intelligence Report`
- wire bucket counts from backend response once API contract exists
- support separate draft preview projection vs full needs-confirmation queue projection
- keep confirmation navigation target abstracted from current host route

Validation:
- unit-test bucket derivation logic
- confirm streams land in only one primary bucket at a time
- confirm `persisted_stream` vs `draft_item` rendering paths stay type-safe and route correctly

### Sprint 3 - proposal commercial follow-up UI

Goal: make `Proposal` bucket useful, not just visible.

Files:
- `frontend/app/dashboard/page.tsx`
- new dashboard proposal state UI component(s)
- `frontend/lib/types/proposal-ui.ts`

Tasks:
- add proposal subfilter bar inside `Proposal` bucket
- show current commercial state badge per row
- add quick action to open workspace proposal section
- keep dashboard proposal state read-only in this phase; edits happen in workspace

Validation:
- proposal rows filter by commercial state
- state copy matches product language exactly

## 7. Backend implementation plan

### Sprint 4 - backend support for dashboard buckets

Goal: extend or replace current dashboard stats/list APIs with dashboard-specific semantics.

Files:
- `backend/app/models/project.py`
- `backend/app/models/proposal.py`
- `backend/app/schemas/project.py`
- `backend/app/schemas/proposal.py`
- `backend/app/api/v1/projects.py`
- `backend/app/api/v1/bulk_import.py`
- `backend/app/schemas/bulk_import.py`
- `frontend/lib/api/projects.ts`
- `frontend/lib/api/bulk-import.ts`
- `frontend/lib/routes.ts`

Tasks:
- add dedicated dashboard endpoint(s) or projection contract with dashboard-specific semantics; do not overload legacy project list/stats if it makes contracts ambiguous
- return dashboard bucket counts, row projection fields, and proposal commercial state needed by dashboard
- expose explicit fields/booleans for pending confirmation, missing required info, intelligence-report readiness, and proposal follow-up presence/state
- keep `project.status` and `proposal.status` as canonical lifecycle/version fields; do not overload them
- expose draft preview data for `Total Waste Streams` right rail from staging sources
- expose full unconfirmed/draft queue for `Needs confirmation` from staging sources
- expose a stable confirmation-flow navigation target that can later point to `Discovery Wizard`

Validation:
- API returns stable counts for each bucket
- frontend no longer infers critical data from incomplete fields only
- dashboard counts and lists stay consistent under search/company/archive filters

### Sprint 5 - persisted proposal commercial workflow

Goal: support real proposal follow-up lifecycle.

Files:
- `backend/app/models/project.py` or new dedicated stream-level follow-up model
- new Alembic migration in `backend/alembic/versions/`
- `backend/app/schemas/project.py`
- `backend/app/api/v1/projects.py`
- related frontend API/types

Tasks:
- add persisted commercial state field
- add stream-level transition endpoint(s) under project/dashboard API ownership
- add transition validation rules
- write timeline event on every change
- notification delivery is follow-up work unless an existing concrete channel is identified

Validation:
- state transitions audited
- invalid transitions rejected
- notification path tested

## 8. Recommended data design

Recommendation:
- keep dashboard buckets derived
- persist proposal commercial state on a stream-level domain object

Preferred first implementation:
- store stream-level proposal follow-up on `Project` unless a separate stream-level follow-up entity becomes necessary

Why:
- derived buckets stay aligned with workspace truth
- proposal follow-up is a real business event stream
- avoids duplicating status logic across dashboard + workspace
- avoids coupling commercial follow-up to proposal document versioning
- keeps future workspace redesign easier

## 9. Testing strategy

Frontend:
- unit tests for bucket derivation helpers
- component tests for bucket switching and proposal subfilters
- responsive verification for dashboard shell
- navigation tests for draft preview -> confirmation flow entrypoint

Backend:
- API tests for bucket counts/list filters
- model/schema tests for proposal commercial states
- timeline tests for state change
- staging draft projection tests for preview rail and needs-confirmation queue

Manual QA:
- stream with pending confirmation appears only in `Needs confirmation`
- stream with missing required info appears only in `Missing information`
- sufficiently complete stream appears in `Intelligence Report`
- uploaded proposal moves stream into `Proposal`
- changing proposal commercial state updates dashboard and emits timeline audit event
- `Total Waste Streams` shows draft preview rail without overpowering confirmed table
- clicking a draft from rail opens confirmation flow entrypoint directly

## 10. Risks

- mixing old project statuses with new dashboard buckets
- using 100% completeness instead of readiness threshold for `Intelligence Report`
- persisting dashboard buckets and creating double source of truth
- coupling proposal commercial state to proposal version status
- shipping UI before counts/list data is trustworthy
- coupling dashboard navigation to the current company-page review host before `Discovery Wizard` replaces it

## 11. Suggested rollout order

1. lock naming + backend projection fields
2. extend backend stats/list contract
3. ship dashboard shell against real projection
4. ship proposal bucket/subfilters
5. ship persisted proposal commercial state
6. ship timeline audit
7. ship notifications only if channel/owner is defined

## 12. Acceptance criteria

- dashboard no longer centered on hero/pipeline/progress semantics
- dashboard buckets match new IA exactly
- `Intelligence Report` uses readiness threshold, not 100% completeness
- dashboard navigates into workspace for deep actions
- proposal commercial follow-up is clearly separated from workspace document/version logic
- draft/unconfirmed navigation uses a confirmation-flow target that can survive the future `Discovery Wizard` move
- proposal commercial state changes create timeline audit events
- company filter hides unassigned drafts and shows them only in global dashboard view

## Open follow-up

- When `Discovery Wizard` replaces the current bulk import / voice review host, keep the dashboard confirmation target contract stable.
- If proposal documents/versioning expand later, confirm whether version history stays purely archival while the active commercial state remains stream-level.
