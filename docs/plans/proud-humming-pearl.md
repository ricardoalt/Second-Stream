# Workspace auto-analysis UX

## Context

Workspace flickers during file processing because `hydrate()` always sets `loading=true` and the shell swaps canvas for spinner on every background poll. Users must manually click "Analyze ready files" even after all uploads complete. Header copy/layout is stale.

## Changes

### 1. `workspace-store.ts` — background hydrate + session state

**New state fields:**
- `initialized: boolean` — true after first successful hydrate
- `hydrating: boolean` — mutex replacing `loading` for concurrent-call guard
- `uploadSessionFileIds: string[]` — file IDs from current upload batch
- `autoAnalysisGuard: "idle" | "waiting" | "ran"` — session lifecycle

**`hydrate()` change:**
- Replace guard: `if (hydrating && projectId === current) return`
- Set `loading = true` only when `!initialized || projectId !== current` (initial load / project switch)
- Always set `hydrating = true`
- On success/error: clear `hydrating`; clear `loading` as before

**`applyHydrateData()` change:**
- Set `initialized = true`

**New actions:**
- `registerUploadedFile(fileId)` — push to `uploadSessionFileIds`; set `autoAnalysisGuard = "waiting"` if idle or "ran"
- `clearUploadSession()` — reset `uploadSessionFileIds = []`, `autoAnalysisGuard = "idle"`

**`reset()`:** also clear new fields.

### 2. `file-uploader.tsx` — pass file ID back

- Change `onUploadComplete?: () => void` → `onUploadComplete?: (fileId: string) => void`
- Line 101: capture response (`const response = await projectsAPI.uploadFile(...)`)
- Line 120: `onUploadComplete?.(response.id)` (type is `ProjectFileUploadResponse.id: string`)

### 3. `workspace-canvas.tsx` — session tracking + auto-analysis

**Upload callback:**
```tsx
onUploadComplete={(fileId) => {
    registerUploadedFile(fileId);
    if (isDirtyRef.current) {
        pendingHydrateRef.current = true;
    } else {
        hydrate(projectId);
    }
}}
```

**New store subscriptions:** `uploadSessionFileIds`, `autoAnalysisGuard`, `clearUploadSession`

**New `useEffect` — auto-analysis reconciliation:**
- Skip if `autoAnalysisGuard !== "waiting"` or no session files
- Match session file IDs against `evidenceItems`; check all are terminal (`completed`|`failed`)
- If not all found/terminal → wait for next hydrate
- If all terminal but dirty → skip (effect re-fires when dirty clears)
- If all terminal but `proposalBatch` exists → `clearUploadSession()` (don't stack)
- If all failed → `toast.error(...)`, `clearUploadSession()`
- If at least one completed and not dirty → call `runAnalysis(projectId)`:
  - On success: if no proposals, `toast.info("Analysis complete...")`; `clearUploadSession()`
  - On error: `toast.error("Auto-analysis failed")`; `clearUploadSession()`
- Set `autoAnalysisGuard = "ran"` before calling to prevent re-entry

**Existing dirty-clears effect:** no change needed — the auto-analysis effect already depends on dirty flags, so it re-evaluates when dirty clears.

### 4. `workspace-shell.tsx` — no changes needed

Shell already only shows spinner when `loading` is true. Since `hydrate()` won't set `loading` on background refreshes, no shell changes required. `<WorkspaceHeader>` and `<ProposalReviewModal>` already render unconditionally.

### 5. `workspace-header.tsx` — layout + copy

- Fix stale copy: "click Start analysis to generate" → "Upload evidence and run analysis to generate"
- Move `<Progress>` coverage bar below summary, outside the left/right flex row, full-width across header
- Keep existing order: breadcrumb → title+badges → metadata → summary → (now) full-width coverage bar → actions stay in the title row

## Files to modify

| File | Change |
|------|--------|
| `frontend/lib/stores/workspace-store.ts` | Background hydrate, session state, new actions |
| `frontend/components/shared/common/file-uploader.tsx` | Pass file ID in callback |
| `frontend/components/features/workspace/workspace-canvas.tsx` | Session registration, auto-analysis effect |
| `frontend/components/features/workspace/workspace-header.tsx` | Coverage bar position, stale copy |

## Adjustments from review

1. **Shell explicit guard**: `workspace-shell.tsx` renders spinner only when `loading && !initialized`, not just `loading`.
2. **Store guards**: auto-analysis skipped if `refreshing === true` OR `proposalBatch !== null`.
3. **Session reset matrix**:
   - Proposals found → `clearUploadSession()` after modal open (guard = "idle", fileIds = [])
   - No proposals → toast info, `clearUploadSession()`
   - All failed → toast error, `clearUploadSession()`
   - Hydrate error → no session change (session persists, retries on next hydrate)
   - Refresh-insights error → toast error, `clearUploadSession()`
4. **Non-goal**: uploads from Files view / other tabs don't participate in auto-analysis. Only uploads via workspace canvas FileUploader register into session. Manual analyze remains fallback everywhere.

## Verification

1. Upload 1 file → no page blink; auto-modal after processing completes
2. Upload 3 files → no blink; one modal after all 3 terminal
3. Upload 3, 1 fails → modal after 2 complete + 1 fail; uses completed files
4. Upload more while prior processing → merged session, one modal
5. Type while processing → no modal until save completes and dirty clears
6. Pending proposal batch → no auto-re-run
7. Manual "Analyze ready files" → still works
8. `cd frontend && bun run check:ci` passes
