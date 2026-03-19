# Plan: Workspace document-analysis reset

Generated: 2026-03-19
Complexity: Medium

## Overview

Reset workspace file analysis to the old reliable shape:

- one ingestion pipeline
- one document-analysis agent
- one proposals contract
- one deterministic workspace merge/confirm step

No legacy compatibility layer.

## Sprint 1: Replace mixed AI contract

Goal: make document analysis emit only workspace-native output.

**Demo/Validation**:
- agent schema has only `summary` + `proposals`
- prompt optimizes only for field proposals with evidence

### Task 1.1: Replace document-analysis schema
- **Location**: `backend/app/models/document_analysis_output.py`
- Remove `suggestions`, `unmapped`, `key_facts`, `workspace_proposals`
- Add discriminated proposal model for `base_field` vs `custom_field`
- **Acceptance Criteria**:
  - schema is workspace-native only
  - base-field proposals are explicit, not label-inferred

### Task 1.2: Rewrite document-analysis prompt
- **Location**: `backend/app/prompts/document-analysis.md`
- Focus prompt on proposal extraction only
- Add examples for `pdf`, `docx`, `xlsx`
- **Acceptance Criteria**:
  - prompt no longer mentions legacy intake outputs
  - prompt forbids placeholders/checklists/transactional fields

### Task 1.3: Update agent entrypoint
- **Location**: `backend/app/agents/document_analysis_agent.py`
- Keep same shell; adapt inputs if text-based route is added
- **Acceptance Criteria**:
  - agent returns new contract only

## Sprint 2: Restore real document support in ingestion

Goal: make accepted workspace file types actually process.

**Demo/Validation**:
- `pdf` reaches document analysis on new contract first
- then `docx`, `xlsx`, `csv`, `txt` reach same contract

### Task 2.0: Land one vertical slice first
- **Location**: agent + ingestion + workspace flow
- Get `pdf` end-to-end working on the new contract before extending other formats
- **Acceptance Criteria**:
  - one real PDF produces modal proposals end-to-end

### Task 2.1: Reuse text extractors for office/text docs
- **Location**: `backend/app/services/intake_document_pipeline.py`, `backend/app/services/document_text_extractor.py`
- Route `docx`, `xlsx`, `csv`, `txt` through deterministic extraction before agent call
- Keep `pdf` binary path
- Keep spreadsheet scope narrow: plain-text flatten only; no table reconstruction
- **Acceptance Criteria**:
  - office/text docs no longer fail as `unsupported_file_type`

### Task 2.2: Align file acceptance with real support
- **Location**: backend/frontend file upload config
- Ensure allowed extensions match actual processing behavior
- **Acceptance Criteria**:
  - no file type is advertised without real pipeline support

## Sprint 3: Simplify persistence + workspace orchestration

Goal: workspace reads one stored proposal contract only.

**Demo/Validation**:
- completed file stores `summary` + `proposals`
- `Start analysis` opens modal from stored proposals only

### Task 3.1: Simplify document-analysis persistence
- **Location**: `backend/app/services/intake_ingestion_service.py`
- Persist only workspace analysis payload on `ProjectFile.ai_analysis`
- Remove legacy suggestion/unmapped persistence from this path
- Treat old analyzed payloads as stale; require re-analysis instead of mixed parsing
- **Acceptance Criteria**:
  - no workspace dependency on old intake rows

### Task 3.2: Simplify workspace merge/build logic
- **Location**: `backend/app/services/workspace_service.py`
- Read `proposals` only
- Dedupe by explicit target identity
- Keep backend filtering minimal and hard-rule based
- Remove file-derived `key_facts` / `unmapped` rendering from this path
- **Acceptance Criteria**:
  - zero second AI step
  - modal batch built deterministically from completed files

## Sprint 4: Support confirm into base + custom fields

Goal: confirmed proposals land in the right workspace fields.

**Demo/Validation**:
- base-field proposal updates base field
- custom-field proposal creates editable custom field

### Task 4.1: Extend proposal batch schema
- **Location**: `backend/app/schemas/workspace.py`, frontend workspace types/store/api
- Carry proposal target identity through modal and confirm payload
- **Acceptance Criteria**:
  - modal can represent base-field and custom-field proposals clearly

### Task 4.2: Update confirm behavior
- **Location**: `backend/app/services/workspace_service.py`
- Base-field proposals patch stored base fields
- Custom-field proposals create custom fields
- Allow modal edits with server-side validation:
  - base-field proposal can edit `answer` only
  - custom-field proposal can edit `label` + `answer`
  - target identity remains immutable
- Reject edited custom labels that collide with existing custom fields
- **Acceptance Criteria**:
  - base-field proposals no longer fail as forbidden
  - legit modal edits persist
  - target tampering still fails

## Testing

- `cd backend && make check`
- `cd frontend && bun run check:ci`
- add/update backend tests for:
  - document-analysis output parsing
  - `docx`/`xlsx`/`csv`/`txt` routing
  - proposal merge rules
  - confirm base-field proposal
  - confirm custom-field proposal
- manual smoke:
  - upload `pdf`
  - upload `docx`
  - upload `xlsx`
  - click `Start analysis`
  - edit in modal
  - confirm
  - verify workspace fields updated

## Risks

- shared consumers of old `DocumentAnalysisOutput` must be updated in same change
- `xlsx` extraction quality may need prompt tuning for table-heavy files
- frontend modal must show base-field proposals distinctly enough to avoid confusion

## Rollback

- revert to current workspace proposal path only if reset fails early
- do not reintroduce second AI layer as rollback

## Unresolved questions

- none
