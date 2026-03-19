# Workspace single-analysis migration spec

Date: 2026-03-19
Goal: remove proposal generation from `workspace_insights_agent`; use document analysis as proposal source.

## Why

Current flow is over-layered:

- file upload -> document AI
- workspace `Start analysis` -> workspace AI over reduced digest
- workspace AI -> proposal batch

This loses document detail, hurts proposal quality, and complicates UX/debugging.

## Target flow

One AI source for proposals:

1. user uploads 1..N files
2. each file runs document analysis
3. document analysis persists:
   - summary
   - proposed fields with answers + evidence
   - optional missing info
4. workspace `Start analysis` becomes deterministic orchestration:
   - gather completed file analyses
   - merge/dedupe proposed fields across files
   - build proposal batch
   - update summary / missing info from stored file analyses
5. modal opens from that batch
6. user confirms selected proposals -> custom fields

## Keep

- file upload / processing pipeline
- `document_analysis_agent`
- proposal modal
- confirm custom-field flow
- summary in workspace header
- same-route files view

## Stop using for proposals

- `workspace_insights_agent`
- digest-based proposal generation
- old workspace proposal prompt/filter chain as primary source of fields

## Proposal source of truth

For this slice, proposals come from document analysis output only.

- each proposal must already contain:
  - field label
  - answer
  - confidence
  - evidence refs
- no second LLM reinterpretation step before modal

Normative proposal shape:

- `field_label`
- `proposed_answer`
- `confidence`
- `evidence_refs[]`
- optional `missing_info[]` stays separate from proposals

## Start analysis readiness rule

- `Start analysis` is enabled when at least 1 uploaded evidence item is `completed`
- `queued` / `processing` files do not block analysis
- analysis uses only the completed subset available at click time
- UI should state that clearly when some files are still processing

## Summary / missing info

For migration slice:

- simplest path: derive workspace summary from completed file analyses deterministically or keep current summary source if cheap
- do not block migration on perfect multi-file synthesis
- acceptable v1.5: use latest/highest-confidence completed evidence summary, then improve later

## Merge policy across multiple files

Keep it simple:

- normalize label
- if same normalized label appears multiple times:
  - keep highest confidence proposal
  - keep evidence refs from chosen proposal
- tie-breaker: if confidence ties, keep the proposal with more evidence refs; if still tied, keep first stable insertion order
- if conflict handling is unclear, prefer deterministic winner over extra AI step

## Field policy

Allowed proposals:

- atomic: `pH`, `flash point`, `% acetone`, `UN number`
- compound operational: `storage conditions`, `handling constraints`, `hazard classification`, `packaging type`, `transport constraints`

Forbidden:

- checklist / diligence prompts
- transaction-specific fields
- speculative answers
- placeholder answers

## Migration plan

### Phase 1

- extend document-analysis output/schema/prompt to be workspace-native
- persist proposed fields + evidence on `ProjectFile.ai_analysis`

### Phase 2

- change workspace `Start analysis` to read completed file analyses directly
- build proposal batch deterministically from stored per-file proposals
- stop calling `workspace_insights_agent` for proposals

### Phase 3

- keep proposal modal + confirm flow unchanged where possible
- keep custom fields editable

## Acceptance

- upload PDF with extractable facts
- file analysis produces evidence-backed proposed fields
- `Start analysis` opens modal from stored file proposals
- no second AI pass required for proposal generation
- proposal quality improves vs current weird/empty outputs

## Out of scope

- perfect cross-document synthesis
- AI editing existing fields
- redesign of files subsystem

## Risks

- downstream code still expecting old document-analysis `suggestions` semantics
- summary quality may be simpler at first than ideal cross-file synthesis

## Unresolved questions

- whether summary should also migrate fully to document-analysis-derived merge now, or in a follow-up
