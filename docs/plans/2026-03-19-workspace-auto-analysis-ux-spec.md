# Workspace auto-analysis UX spec

- Generated: 2026-03-19
- Scope: workspace upload/process/review loop + header layout polish

## Goal

- Stop workspace flicker while files upload/process.
- When user uploads multiple files, wait until all finish AI processing, then auto-run workspace analysis once and open one consolidated proposal modal.
- Reorder header to match intended hierarchy: project info -> summary -> full-width progress bar.

## Current issues

- Polling calls `hydrate()` repeatedly; `hydrate()` always sets `loading=true`; `workspace-shell` swaps whole canvas for spinner. Result: visible page blink during processing.
- Completed files do not trigger proposal review automatically; user must click `Analyze ready files`, even when all uploaded files are already done.
- Header hierarchy is off: summary and coverage feel secondary and copy is stale.

## Decisions

- Keep explicit analysis for legacy/manual cases, but add upload-session auto-analysis for new uploads.
- Track upload session at uploader boundary in frontend; do not infer session from hydrate deltas alone.
- Auto-analysis triggers only when all files from the active upload session have reached terminal state (`completed` or `failed`) and at least one completed file is newly ready.
- Auto-open exactly one modal per upload session; never one modal per file.
- If another proposal batch is already pending in current tab, do not auto-run again; keep pending review state instead.
- If local edits are dirty, defer session reconciliation until dirty clears; do not auto-open modal while user is typing.
- Coverage bar moves below summary and spans full header width; visual support only, not primary CTA.

## UX changes

### 1) No flicker processing state

- Distinguish first-page hydrate from background refresh.
- Background polling/upload refresh must not flip workspace into full-page loading spinner.
- Evidence list and analysis card should update in place.

### 2) Auto-review after upload session completes

- Track uploaded file ids for current workspace upload session from `FileUploader` callback.
- If user uploads more files before prior session finishes, merge them into one active session.
- After each background hydrate, detect whether all session files are terminal.
- If yes, and there is no pending batch/modal already, auto-call `refresh-insights` once.
- If proposals exist, open one consolidated modal automatically.
- If no proposals exist, show passive success/toast only.
- If all files fail, show passive failure toast only and clear session.
- Dedupe/instant-complete uploads still belong to session and count toward completion.

### 3) Header hierarchy polish

- Keep project metadata at top.
- Show summary directly below metadata, more prominent, aligned with wireframe.
- Move progress bar below summary, full-width across content area.
- Remove stale copy mismatch (`Start analysis`) and align labels with actual CTA names.

## Implementation outline

1. `frontend/lib/stores/workspace-store.ts`
   - add non-blocking background hydrate path
   - keep `loading` for initial page load only
   - track upload session state + auto-analysis guard
   - queue reconcile while dirty, flush once dirty clears
2. `frontend/components/features/workspace/workspace-shell.tsx`
   - only show full-page spinner on first hydrate/no data
   - do not blank canvas during polling refreshes
3. `frontend/components/features/workspace/workspace-canvas.tsx`
   - register uploads into current session
   - trigger auto-analysis when session completes
   - keep manual analysis CTA as fallback/re-run control
4. `frontend/components/features/workspace/workspace-header.tsx`
   - reorder summary/progress layout
   - update copy and spacing toward wireframe

## Validation

- Upload 1 file: no page blink; when processing completes, one auto-review modal appears.
- Upload 3 files together: no page blink; modal opens once after all 3 are terminal.
- Upload 3 files, 1 fails: modal opens once after remaining processing ends, using completed files only.
- Upload more files while prior session still processing: still one consolidated auto-review.
- If a proposal batch is already pending, new processing completion does not stack another modal.
- Type into fields while files process: no modal interrupts typing; pending auto-review appears after autosave/dirty clears.
- Manual `Analyze ready files` still works for existing evidence.

## Risks

- Auto-analysis can feel surprising if it opens while user is typing; guard by only auto-running when no dirty local edits.
- Failed files must not block session completion forever.
- Session tracking must reset cleanly after modal open or upload abandonment.
- Files uploaded outside workspace view are out of scope for this pass; manual analyze remains fallback there.

## Unresolved questions

- None.
