# Workspace v1 Discovery Canvas Spec

Date: 2026-03-17
Scope: redesign persisted waste-stream workspace using current questionnaire base

## Goal

Turn the current `Questionnaire` area into a real workspace for persisted waste-streams.

- `Needs Confirmation` stays separate; it is draft-only
- workspace starts only after draft -> real waste-stream
- workspace is where concentrated evidence, facts, and accepted custom fields live
- reuse the current project/workspace base; do not reinvent the whole app

## Product stance

- workspace is for persisted waste-streams, not drafts
- evidence is primary input
- user text in workspace is context/instruction for interpreting evidence
- user text is **not** an independent discovery source
- keep 5 fixed base questions/fields always visible
- AI proposes additional fields only through a transient review modal after evidence analysis
- user edits/selects proposed fields in the modal before they become real workspace fields
- fixed base fields remain the only hard gate in v1

## Locked decisions

- route stays `/project/[id]`
- workspace replaces the current questionnaire-first mental model
- reuse the current shell and as much existing technical-data infrastructure as possible
- top area shows compact general info + working summary; no separate body `overview` block
- `Files` opens as a full-screen integrated view inside the same route using local view switch
- `Contacts` is a button/link to the location contacts view, not a heavy nested tab
- evidence uploads include SDS, lab analysis, PDFs, images, voice notes, and similar support docs
- AI can propose new custom fields only; it does not create or rename fixed base fields through the proposal modal
- AI can fill candidate answers, update summary, and update missing-info list
- user can edit answers manually at any time
- `% filled` becomes `information coverage`; useful signal, not the primary readiness gate

## Core workspace model

One persisted waste-stream workspace has 4 layers:

1. fixed base fields
   - the default required stream-definition fields carried over from confirmation flow
2. evidence items
   - uploaded files, notes, voice, lab docs, SDS, PDFs
3. custom workspace fields
   - user-approved extra fields beyond the fixed base set
4. derived blocks
   - summary
   - composition/facts
   - missing information
   - coverage/readiness

Important rule:

- do **not** build a generic dynamic form builder in v1
- use stable fixed fields + simple custom field instances

## AI field proposal modal

After evidence analysis completes, AI can return one transient proposal batch.

- the proposal batch opens in a modal
- each proposal contains:
  - temporary id
  - proposed field name
  - proposed answer
  - selected state
  - optional evidence refs
- proposals are for **new custom fields only**
- user can edit:
  - field name
  - field answer
  - selection on/off
- confirm:
  - creates selected fields in the workspace
  - closes modal
- cancel/close:
  - discards the proposal batch
  - does not mutate workspace fields

Important rule:

- AI proposals are transient review objects, not persisted workspace fields until user confirms them

## Source-of-truth matrix

| Layer | Persisted | User editable | Affects readiness | AI can update | Notes |
|---|---|---:|---:|---:|---|
| Base fields | yes | yes | yes | yes, as suggestion/prefill | canonical stream-definition fields |
| Evidence items | yes | metadata only | indirect only | extraction only | primary factual inputs |
| Context note | yes | yes | no | yes, as interpretation input | instruction/context only, not separate source |
| Custom workspace fields | yes | yes | no | no direct auto-write | only created after user confirms AI proposal modal or manual creation |
| AI proposal batch | no | yes | no | yes | transient modal review state only |
| Derived summary/facts | yes | indirectly via source fields | no | yes | derived from evidence + answers |

## Information architecture

### Top strip

- company
- stream name
- location
- primary contact
- top summary sentence
- `Contacts` button
- `Files` button

### Header summary behavior

- summary lives in the top strip / top working header, not a separate overview section in the body
- summary should be compact and derived from current workspace state
- v1 recommendation: update summary when `Refresh insights` runs and when new evidence analysis completes
- avoid making summary re-generate on every keystroke in v1

### Top working header

- compact summary text
- information coverage bar
- main actions, e.g. `Refresh insights`, `Discovery complete`

### Main canvas

Two-column desktop, stacked mobile.

Left column:
- base fields block
- composition / extracted facts block
- custom fields block

Right column:
- evidence upload block
- evidence list/status block
- contextual note/instruction box

### Files view

- `Files` is not a small inline panel
- it should reuse the current files system as a full-screen integrated view within `/project/[id]`
- entering/exiting files should feel like switching workspace subviews, not leaving the workspace context entirely

### Contacts entrypoint

- `Contacts` is a button/link to the current location's contacts view/list
- do not build a new contacts subsystem inside workspace v1

## Base field behavior

- the 5 base fields are always present
- they are editable by user
- they are the only fields that block readiness in v1
- AI can prefill or update suggestions for them, but user remains final authority
- base fields should reuse current value/source/edit patterns where possible
- the AI proposal modal must not be used to mutate the base field set

Primary contact v1 stance:

- treat `primary contact` as the contact for this waste-stream
- display it in the top strip
- do not make workspace v1 auto-manage company primary contact semantics
- if later product wants stronger syncing with location contacts, that should remain explicit

## Custom field behavior

- base fields stay fixed and always visible
- all extra workspace fields are custom fields
- custom fields may come from:
  - AI proposal modal accepted by user
  - later manual add flow if needed
- once created, custom fields behave like normal persisted workspace fields
- custom fields do not block readiness in v1
- do not keep lingering advisory field objects inside the workspace canvas
- AI proposal flow only creates new custom fields; it does not patch existing custom fields in v1

## Evidence behavior

- evidence lives inside the workspace, attached to one persisted waste-stream
- upload triggers AI extraction for facts + field proposals
- failures are per evidence item, not whole workspace
- evidence should show processing state and extraction result state
- the contextual note box should be included in the next AI interpretation pass, but it should not create separate draft entities

## AI behavior in workspace

AI should do only these jobs in v1:

1. read new evidence
2. update candidate facts/summary
3. generate proposed new fields for relevant extracted information
4. update missing-information list

Recommended v1 lifecycle:

- evidence upload => extraction runs automatically per uploaded item
- successful extraction updates candidate facts, summary, and can open one AI proposal modal batch
- context note changes do **not** auto-rerun extraction
- user clicks `Refresh insights` when they want the latest note/context applied to current evidence

AI should not:

- create new canonical schema fields on the fly
- create real workspace fields without user confirmation in modal
- propose edits to existing fields through the new-field modal flow
- auto-advance state without user action
- treat the context note as a parallel intake source like Discovery Wizard

## Progress / readiness

Use two distinct concepts:

1. `information coverage`
   - visual progress bar
   - based on filled base fields + useful evidence/custom field coverage
   - informational only

2. `discovery readiness`
   - gate for `Discovery complete`
   - based only on fixed required base fields in v1

## Reuse vs replace

### Reuse

- `frontend/app/project/[id]/page.tsx`
- `frontend/components/features/projects/technical-data-sheet.tsx`
- technical data autosave/state patterns
- file upload/browser infrastructure
- current project header/base shell

### Replace or heavily refactor

- `frontend/components/features/projects/project-tabs.tsx` as primary IA
- `Questionnaire` naming
- old questionnaire summary/progress framing
- current center-first large form layout

## Recommended implementation shape

### Phase 1 - shell + IA cut

- keep `/project/[id]`
- replace questionnaire tab/content with workspace canvas
- move general info + summary + coverage to top working header
- add `Contacts` button and local `Files` view switch entrypoint

### Phase 2 - base fields block

- lift the fixed base fields into a stable workspace block
- preserve autosave/edit/source behavior where possible
- separate them clearly from custom fields

### Phase 3 - evidence lane

- add evidence upload block + evidence list/status block
- add contextual note box used as AI guidance
- define upload -> extract -> update cycle

### Phase 4 - AI proposal modal + custom fields + missing info

- add AI proposal modal shown after evidence analysis completes
- user edits/selects proposed fields before creation
- create selected fields as persisted custom workspace fields

### Phase 5 - files view + finish actions

- integrate reused files system as same-route full-screen view
- add `Discovery complete`
- keep transitions manual and explicit

### Phase 6 - missing information later

- add missing-information block driven by current facts/evidence
- keep it low priority after core workspace flow lands

## Acceptance criteria

- user opens a persisted waste-stream and lands in a workspace, not a questionnaire tab
- top area shows compact working header, not a redundant overview block
- base fields are always visible and editable
- evidence can be uploaded in workspace context
- AI can propose new fields from evidence in a review modal
- user can edit/select proposals before creating those fields
- user text acts as interpretation context, not a separate source path
- files open as integrated same-route full-screen view
- contacts are reachable from workspace without becoming a new embedded subsystem
- mobile layout stacks cleanly

## Out of scope

- merging `Needs Confirmation` into workspace
- replacing Discovery Wizard again
- a generic schema/form builder
- making AI-proposed custom fields required in v1
- redesigning intelligence/proposal pages in the same change
- fully solving duplicate evidence semantics in this spec
- a separate body overview block duplicated with header info

## Risks

- reusing too much of questionnaire wording/layout and ending with a rename only
- letting AI proposal modal become a disguised dynamic schema builder
- letting the proposal modal silently become an edit flow for existing fields
- making AI-created fields blocking too early
- mixing evidence upload logic with discovery-intake semantics
- making files feel like a disconnected module instead of part of workspace context

## Unresolved questions

- whether `Discovery complete` remains in the main workspace canvas or becomes part of the top working header actions
