# Workspace UX polish spec

Date: 2026-03-19
Goal: make workspace analysis feel intentional, batch-friendly, and visually unified.

## Problem

Current workspace UX feels inconsistent:

- file upload starts backend processing immediately
- when processing finishes, UI gives little/no clear next-step feedback
- user must still click `Start analysis` to get AI proposals
- AI can still propose fields that already exist in workspace
- base fields and custom fields look like separate systems

Result: flow works, but feels confusing and heavier than needed.

## UX decisions

### 1. Keep upload processing automatic

Uploading a file should still enqueue/process it immediately in background.

Reason:

- faster perceived system response
- supports multi-file batching naturally
- avoids a second hidden "prepare files" step after upload

But processing is not the same as analysis.

## 2. Make analysis an explicit batch action

Workspace analysis stays manual and intentional.

New mental model:

1. upload files
2. wait for files to become ready
3. click one clear CTA to analyze ready files
4. review AI updates in modal

Do not auto-open modal when a file finishes processing.

## 3. Improve evidence-to-analysis status copy

Replace vague analysis copy with stateful copy tied to file readiness.

Examples:

- no files: `Upload files to start building this waste stream`
- files uploading/processing: `2 files processing`
- ready but not analyzed: `2 files ready for analysis`
- analyzed, no new ready files: `Analysis up to date`
- analyzed, new files ready: `2 new files ready for analysis`

Primary CTA should also be contextual:

- `Analyze ready files`
- `Review AI updates`
- `Re-analyze with 2 new files`

`Start analysis` is too generic.

## 4. Do not propose duplicates as new fields

When AI output matches existing workspace state:

- if proposed field/value is effectively already present, suppress it
- if AI has a materially better value for an existing field, show it as a suggested update, not a new field

Applies to both:

- base fields
- existing custom fields

Goal: review modal should show meaningful deltas only.

## 5. Proposal modal should distinguish new vs update

Review modal should group or label proposals as:

- `Suggested updates`
- `New fields`

This gives user immediate clarity:

- update existing answer
- or add new field to workspace

Do not present everything as generic "proposals".

## 6. Unify workspace fields visually

Replace strong separation between `Base Fields` and `Custom Fields`.

Target presentation:

- one main `Fields` section
- base fields first because they are always present
- additional/custom fields below in same visual pattern
- optional subtle badge/marker for origin only if useful (`Core`, `AI-added`)

Do not use two large cards that imply two different subsystems.

## 7. Keep feedback passive, not interruptive

When file processing completes:

- do not auto-open modal
- do not show disruptive dialogs
- do show lightweight inline status/nudge near analysis CTA

Examples:

- `Files ready for analysis`
- `New evidence available`

Toast is optional support, not primary UX.

## Scope

In scope:

- analysis CTA copy/state
- evidence readiness messaging
- duplicate suppression/update behavior in proposal review flow
- modal labeling for new vs update
- unified field presentation in workspace canvas

Out of scope:

- changing backend ingestion architecture
- auto-confirming AI changes
- rebuilding workspace layout from scratch

## Acceptance

- uploading multiple files feels normal and batch-friendly
- user clearly understands difference between processing and analysis
- workspace shows a contextual analysis CTA based on ready/new files
- modal does not show duplicate-as-new noise
- existing-field improvements show as updates
- fields appear as one integrated workspace form, not two separate systems

## Unresolved questions

- none
