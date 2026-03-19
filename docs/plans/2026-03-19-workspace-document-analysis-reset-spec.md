# Workspace document-analysis reset spec

Date: 2026-03-19
Goal: restore the old reliable file-analysis pipeline shape for workspace; make document analysis the only AI step and proposals the only workspace output contract.

## Problem

Current workspace file analysis is split across old and new semantics:

- document analysis still emits `suggestions`, `unmapped`, `key_facts`, `workspace_proposals`
- ingestion still persists old intake semantics
- workspace modal only opens from `workspace_proposals`

Result:

- files can analyze successfully but modal still gets zero proposals
- prompt quality is diluted across two jobs
- office-doc support regressed in this path even though UI still accepts those files

## Product decision

Workspace file analysis is simple:

1. user uploads file
2. file is normalized for AI analysis
3. `document_analysis_agent` returns proposed fields with proposed answers + evidence
4. workspace builds proposal batch deterministically
5. user reviews/edits in modal
6. confirm persists updates into workspace fields

No second AI pass. No legacy intake semantics in workspace path.

## Scope

This slice resets workspace file analysis to one contract:

- keep: upload queueing, file processing, document-analysis agent, modal confirm flow
- remove from workspace path: `suggestions`, `unmapped`, `key_facts`, workspace re-interpretation semantics
- restore real support for `pdf`, `docx`, `xlsx`, `csv`, `txt`
- preserve current image handling unless a file is explicitly routed as document-like evidence

## Target contract

`DocumentAnalysisOutput` becomes workspace-native.

- `summary: str | None`
- `proposals: list[DocumentProposal]`

Each proposal must be one of:

- base-field proposal
  - `target_kind: "base_field"`
  - `base_field_id`: one of `material_type | material_name | composition | volume | frequency`
  - `answer`
  - `confidence`
  - `evidence_refs[]`
- custom-field proposal
  - `target_kind: "custom_field"`
  - `field_label`
  - `answer`
  - `confidence`
  - `evidence_refs[]`

Rules:

- evidence required
- no placeholders
- no checklist labels
- no transactional labels
- no speculative proposals
- propose base fields directly when document supports them; do not guess by label matching

## File routing

Use one ingestion shell, one document-analysis contract.

- `pdf` -> send binary to document agent
- `docx`, `xlsx`, `csv`, `txt` -> deterministic text extraction/normalization first, then document agent on text
- `jpg`, `jpeg`, `png` -> keep current behavior for now unless explicitly routed as document evidence

Do not advertise file types that this pipeline cannot actually process.

## Persistence

Persist only what workspace needs from file analysis:

- `summary`
- `proposals`

Do not keep legacy compatibility shims. Early-stage repo; remove mixed contract now.

Previously analyzed files with old `ai_analysis` payloads are out of contract for this slice.

- simplest rollout: require re-analysis after deploy
- no mixed old/new payload handling in workspace service

## Workspace orchestration

`Start analysis` becomes deterministic only:

- load completed files
- collect stored proposals
- merge/dedupe
- map evidence refs to filenames
- open modal if batch non-empty

No LLM call in workspace service.

Merge rule:

- dedupe by exact target identity
- base fields dedupe by `base_field_id`
- custom fields dedupe by normalized `field_label`
- winner: highest confidence; tie -> more evidence refs; tie -> first stable insertion order

## Confirm behavior

Modal can confirm:

- base-field proposals -> patch matching base fields
- custom-field proposals -> create custom fields

Modal edits are allowed before confirm.

- base-field proposals: user may edit `answer`; target field is immutable
- custom-field proposals: user may edit `field_label` and `answer`
- backend validates edited values against hard rules before persist

Confirmed values become normal editable workspace fields.

Duplicate rule:

- proposal batch should pre-drop obvious duplicates
- if user-edited custom label collides with an existing custom field, backend rejects confirm for that proposal

## Workspace surfaces

For this reset, workspace file-derived UI uses:

- file/evidence cards: `summary` only
- proposal modal: `proposals`

Do not keep rendering `key_facts` or `unmapped` from file analysis.

## Acceptance

- upload `pdf` with extractable facts -> modal opens with proposals
- upload `docx` or `xlsx` with extractable facts -> same
- proposal batch can contain base-field and custom-field proposals
- confirm updates base fields and/or creates custom fields
- workspace analysis does not depend on `suggestions`, `unmapped`, or `key_facts`

## Out of scope

- perfect multi-file synthesis beyond deterministic merge
- automatic mutation without user confirm
- keeping legacy intake contract alive for compatibility

## Unresolved questions

- none
