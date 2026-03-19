# Workspace Analysis Flow Follow-up Spec

Date: 2026-03-18
Scope: refine workspace behavior after first frontend/backend pass

## Why this follow-up exists

The current workspace foundation is in place, but the evidence -> AI -> fields flow still feels wrong.

Current pain points:

- upload and analysis are conflated in the UI
- `Refresh Insights` is doing analysis work, but the label hides that
- users may want to upload 2-3 files before running AI once
- AI-created custom fields render as static cards and feel unlike the editable base fields
- there is a visible `Key Facts` block today even though it is not part of the intended wireframe

## Product goal

Make the workspace feel like a focused working canvas:

- users upload evidence first
- users explicitly run one analysis over the current evidence bundle
- AI returns:
  - updated summary
  - updated missing-info guidance
  - proposed new fields with proposed answers
- user reviews proposed fields in a modal
- confirmed fields become normal editable workspace fields

## Locked decisions

- keep `/project/[id]` as the workspace route
- keep `Files` as same-route full-screen integrated view
- keep `Needs Confirmation` fully separate
- do not auto-run AI on every local edit
- do not auto-run AI on every autosave
- do not let AI directly create persisted fields without modal confirmation
- AI proposals are for **new fields only**, not edits to existing fields

## Upload vs analysis

### Upload

Upload should stay dumb.

- uploading a file only creates/updates `evidenceItems`
- processing status still runs per evidence item
- no summary/custom-field mutation should happen from upload alone
- multiple uploads in one session are allowed before analysis

### Analysis

Analysis should be one explicit user action.

- replace the current mental model of `Refresh Insights`
- preferred label:
  - first run: `Start analysis`
  - later runs: `Re-run analysis`
- analysis uses the current workspace bundle:
  - all `completed` evidence items
  - current saved base fields
  - current saved context note
  - existing custom fields

Important v1 rule:

- if some evidence is still `queued/processing`, analysis runs only on the completed subset
- UI should say that clearly, e.g. `2 ready, 1 still processing`

Action availability:

- `Start analysis` / `Re-run analysis` is disabled when `0` evidence items are `completed`
- uploaded-but-still-processing files do not enable analysis by themselves

## Summary behavior

- summary stays compact in the header
- summary remains expandable/collapsible
- summary updates only when analysis runs successfully
- local edits do not regenerate summary automatically
- local edits or new completed evidence mark summary as stale
- stale summary stays visible until user runs analysis again

Derived output rule:

- treat `summary` and later `missing information` as the primary visible derived set in v1
- backend `facts` can still exist, but they should not drive a standalone `Key Facts` section in this slice

## Field model

### Base fields

- stay fixed and always visible
- remain the only readiness gate in v1

### Proposed fields

- AI returns proposed field name + proposed answer
- proposal modal remains the review boundary
- user can edit both before confirm

Proposal batch lifecycle:

- only one active proposal batch exists at a time
- re-running analysis replaces any prior unconfirmed batch with a new one
- user-confirmed fields are already persisted and are not removed by replacing the transient batch

### Confirmed custom fields

Confirmed fields should no longer look like static AI cards.

- after confirm, they should render like normal editable workspace fields
- same general interaction model as base fields:
  - label
  - answer/value input
  - autosave/edit state
- provenance/evidence refs can remain secondary metadata under the field

Editable scope for v1:

- confirmed custom fields should support editing `label` and `answer`
- do not promise manual add/delete/reorder in this slice unless backend support already exists cleanly

Important rule:

- custom fields are a second editable field block, not a read-only insights gallery

## Information hierarchy

Recommended main-column order:

1. base fields
2. custom fields
3. missing information later/secondary

Reason:

- editable information must come before derived/supporting information
- do not add a standalone `Key Facts` block that was not part of the intended product shape

## Missing information

- keep it deprioritized
- do not let it block the next slice
- if needed, collapse it or keep it below the editable field blocks

## Recommended UI changes

### Header actions

- rename `Refresh Insights` to analysis-oriented action
- make it the clear next step after evidence upload
- keep `Discovery Complete` disabled/secondary for now

### Evidence lane

- keep upload block
- keep evidence list/status block
- show analysis readiness state near the action
- example states:
  - `No evidence uploaded`
  - `3 files uploaded`
  - `2 ready, 1 processing`

## State table

| Workspace state | UX behavior |
|---|---|
| `0 completed evidence` | analysis action disabled |
| `some completed, some processing` | analysis action enabled; copy clarifies analysis uses ready files only |
| `all uploaded evidence completed` | analysis action enabled normally |
| `derived outputs stale` | keep current summary visible, show stale cue, wait for explicit analysis |
| `active proposal batch present` | modal review is current pending AI output; next analysis replaces it |

### Proposal modal

- keep existing modal foundation
- keep editable label + answer + selected state
- clarify copy that confirm will add editable fields to the workspace

## Backend implications

Current backend already supports most of the analysis flow:

- explicit `POST /workspace/refresh-insights`
- proposal batch
- proposal confirm

Current backend also returns `facts`, but v1 frontend does not need to render them as a standalone block.
They can remain backend output for now and be reused later if product decides they are useful.

Likely backend follow-up needed for the next slice:

- CRUD/update endpoint for persisted custom fields after confirmation
- possibly delete support for custom fields

No new backend job/orchestration system should be introduced unless analysis latency proves unacceptable.

## Acceptance criteria for next slice

- user can upload multiple files before running analysis
- upload alone does not mutate summary/custom fields
- one explicit analysis action runs on current completed evidence bundle
- proposal modal opens from that analysis action
- confirmed custom fields become editable workspace fields
- no standalone `Key Facts` section is required in this slice
- summary remains compact and only updates on successful analysis

## Out of scope

- auto-analysis on every upload
- auto-summary regeneration on every edit
- AI editing base fields directly
- AI editing existing custom fields directly
- redesigning `Files` subsystem itself

## Risks

- keeping the old `Refresh Insights` name and preserving user confusion
- leaving confirmed custom fields as read-only and making the workspace feel incomplete
- coupling upload completion to AI mutation again

## Note on `facts`

`Key Facts` came from earlier workspace thinking and from current backend output, not from the current wireframe.

For this slice:

- keep backend `facts` output if useful internally
- do not make `Key Facts` a primary visible workspace section
- focus visible UI on:
  - summary
  - editable fields
  - missing information later if needed

## Unresolved questions

- whether custom fields should support manual add/delete in the same slice as editable confirmed fields
