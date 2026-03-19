# Plan: Workspace v1 Frontend Implementation

## Context

Recompose `/project/[id]` from tab-first (Overview, Questionnaire, Files, Proposals) into a workspace-first canvas for persisted waste-streams. Backend workspace API already built. Frontend-only (no backend changes).

## Architecture Decisions

### 1. Replace tabs with local view switch
- `viewMode: "workspace" | "files"` via `?view=` URL param. Only 2 modes.
- Default = workspace (no param).
- Proposals tab stays accessible via existing `?tab=proposals` pattern (not migrated in this slice).

### 2. New dedicated workspace store
- `workspace-store.ts` — Zustand + immer, no localStorage persistence.
- Hydrates from `GET /workspace` on mount.
- Separate from `technical-data-store` (dozens of dynamic sections vs 5 fixed fields).

### 3. Base field autosave
- Debounced batch save (1000ms). Keystroke → optimistic store update → debounce → `PATCH /workspace/base-fields`.
- Response returns full `WorkspaceHydrateResponse` → replaces store state.

### 4. Files view = same route, full-screen
- `viewMode === "files"` → renders `FilesSection` as-is + back button. No changes to `FilesSection`.

### 5. Contacts = link to existing location page
- Derive `companyId` via `useLocationStore.loadLocation(locationId)`.
- Link to `/companies/{companyId}/locations/{locationId}`.

### 6. Primary contact = omitted for now
- Not well-modeled yet. Don't fake it from location contacts. Add later from proper waste-stream/project source.

### 7. Discovery Complete = deferred to v2
- Button disabled with tooltip.

### 8. Missing information = deferred
- Not in first slice. Placeholder at most.

### 9. Reuse > rebuild
- Start by refactoring existing components (`technical-data-sheet.tsx`, right lane, layout).
- Extract new subcomponents only when the code demands it during implementation.
- Don't pre-plan 15 component files — let the refactor shape them.

---

## Planned Files

### New (core, minimal set)

| File | Purpose |
|---|---|
| `frontend/lib/types/workspace.ts` | TS types matching backend schemas |
| `frontend/lib/api/workspace.ts` | API client (5 endpoints) |
| `frontend/lib/stores/workspace-store.ts` | Zustand store |
| `frontend/components/features/workspace/workspace-shell.tsx` | Top-level: viewMode switch, hydration, header, canvas |
| `frontend/components/features/workspace/workspace-header.tsx` | Top strip + working header |
| `frontend/components/features/workspace/workspace-canvas.tsx` | 2-col layout, base fields, right lane, facts, custom fields |
| `frontend/components/features/workspace/proposal-review-modal.tsx` | AI proposal dialog with inline editable cards |
| `frontend/components/features/workspace/index.ts` | Barrel exports (update existing) |

Additional subcomponents (e.g., `base-fields-block`, `context-note-block`, `evidence-list-block`, `facts-block`, `custom-fields-block`) extracted only if the code gets too large during implementation. Start inline in `workspace-canvas.tsx`.

### Files to Modify

| File | Change |
|---|---|
| `frontend/app/project/[id]/page.tsx` | Replace `ProjectHeader` + `ProjectTabs` with `WorkspaceShell` |
| `frontend/lib/routes.ts` | Add `WorkspaceView` enum |

### Reused As-Is

- `frontend/components/features/projects/files-section/*` — rendered in Files view
- `frontend/components/shared/common/file-uploader.tsx` — wrapped for evidence upload
- `frontend/lib/stores/project-store.ts` — `loadProject`, `currentProject`
- `frontend/components/ui/dialog.tsx`, `progress.tsx`, `card.tsx` — UI primitives

### NOT Touched

- Discovery Wizard, Needs Confirmation, backend, `technical-data-store.ts`, `proposals-tab.tsx`

---

## Implementation Phases

### Phase 1: Types + API + Store

**1a. `frontend/lib/types/workspace.ts`**
Types matching backend `schemas/workspace.py` (snake_case):
- `WorkspaceBaseField` — `{field_id, label, value, required, is_filled}`
- `WorkspaceCustomField` — `{id, label, answer, created_at, created_by, evidence_refs, confidence}`
- `WorkspaceEvidenceRef` — `{file_id, filename, page, excerpt}`
- `WorkspaceEvidenceItem` — `{id, filename, category, processing_status, uploaded_at, summary, facts, processing_error}`
- `WorkspaceReadiness` — `{is_ready, missing_base_fields}`
- `WorkspaceDerivedInsights` — `{summary, facts, missing_information, information_coverage, readiness, last_refreshed_at}`
- `WorkspaceHydrateResponse` — `{project_id, base_fields, custom_fields, evidence_items, context_note, derived}`
- `WorkspaceProposalItem` — `{temp_id, proposed_label, proposed_answer, selected, evidence_refs, confidence}`
- `WorkspaceProposalBatch` — `{batch_id, proposals, generated_at}`
- `WorkspaceRefreshInsightsResponse` — `{derived, proposal_batch}`
- `WorkspaceConfirmResponse` — `{created_fields, ignored_temp_ids, workspace}`
- `WorkspaceContextNoteResponse` — `{text, updated_at}`
- Base field IDs literal: `"material_type" | "material_name" | "composition" | "volume" | "frequency"`

**1b. `frontend/lib/api/workspace.ts`**
Pattern from `frontend/lib/api/intake.ts`:
```
workspaceAPI.hydrate(projectId) → GET /projects/{id}/workspace
workspaceAPI.updateBaseFields(projectId, fields) → PATCH /projects/{id}/workspace/base-fields
workspaceAPI.updateContextNote(projectId, text) → PATCH /projects/{id}/workspace/context-note
workspaceAPI.refreshInsights(projectId) → POST /projects/{id}/workspace/refresh-insights
workspaceAPI.confirmProposals(projectId, batchId, proposals) → POST /projects/{id}/workspace/custom-fields/confirm
```

**1c. `frontend/lib/stores/workspace-store.ts`**
Zustand + immer. State:
```
projectId, baseFields, customFields, evidenceItems, contextNote, derived, primaryContact
proposalBatch (transient)
loading, refreshing, confirming, baseFieldsSaving, contextNoteSaveStatus, error
```
Actions: `hydrate`, `updateBaseField` (optimistic + debounce), `saveBaseFields`, `updateContextNote` (optimistic + debounce), `saveContextNote`, `refreshInsights`, `updateProposal`, `confirmProposals`, `dismissProposalBatch`, `reset`

### Phase 2: Shell + Header

**2a. `workspace-shell.tsx`**
- `viewMode: "workspace" | "files"` from URL `?view=` param
- On mount: `workspaceStore.hydrate(projectId)`
- Renders:
  - `"workspace"` → `<WorkspaceHeader>` + `<WorkspaceCanvas>` + `<ProposalReviewModal>`
  - `"files"` → back button + `<FilesSection>` (lazy, Suspense)

**2b. `workspace-header.tsx`**
Adapts from `project-header.tsx`:
- Breadcrumb: Dashboard > Project name
- Top strip: stream name (h1), client, location, status badge
- Summary text from `derived.summary`
- Coverage bar from `derived.information_coverage` (reuse `Progress`)
- Action buttons: Contacts (link), Files (sets view), Refresh Insights (button), Discovery Complete (disabled)
- Archive/restore/edit via dropdown (reuse patterns)

**2c. Modify `page.tsx`**
Replace `ProjectHeader` + `ProjectTabs` with `WorkspaceShell`.

**2d. Update `routes.ts`**
Add `WorkspaceView` enum.

### Phase 3: Canvas (base fields + right lane + facts + custom fields)

**`workspace-canvas.tsx`** — single component, extract subcomponents only if it grows too large.

Layout:
```
grid grid-cols-1 lg:grid-cols-5 gap-6
  Left (lg:col-span-3): base fields block, facts block, custom fields block
  Right (lg:col-span-2): evidence upload (FileUploader), evidence list, context note textarea
```

- **Base fields**: Card with 5 labeled inputs. Debounced batch save. Save status badge.
- **Facts**: `derived.facts` as read-only badge/list.
- **Custom fields**: `customFields` as label/answer pairs. Read-only v1.
- **Evidence upload**: wraps `FileUploader`, `onUploadComplete` → re-hydrate.
- **Evidence list**: `evidenceItems` with processing status. Poll while items processing (5s interval).
- **Context note**: textarea with debounced autosave (pattern from `intake-notes-section.tsx`).

### Phase 4: Proposal Modal

**`proposal-review-modal.tsx`**
Dialog opens when `proposalBatch !== null`.
- Scrollable list of editable proposal cards (inline, not separate component unless needed)
- Each: editable label (Input), answer (Textarea), selected (Checkbox), confidence badge, evidence refs
- Confirm → `confirmProposals()` → toast, close, workspace re-hydrated
- Cancel → `dismissProposalBatch()` → close, no API

### Phase 5: Polish

- Responsive: 2-col → stacked on mobile
- Header actions in dropdown on mobile
- Modal responsive
- Aria labels

---

## Patterns to Reuse

| Pattern | Source |
|---|---|
| Debounced autosave | `intake-notes-section.tsx` |
| Save status badges | `technical-data-sheet.tsx:226-271` |
| API client structure | `lib/api/intake.ts` |
| Zustand store | `lib/stores/intake-store.ts` |
| File upload | `shared/common/file-uploader.tsx` |
| Files browser | `projects/files-section/files-section.tsx` |
| Processing poll | `files-section.tsx:115-139` |
| Header + breadcrumb | `project-header.tsx` |
| Archive dialogs | `project-header.tsx` |

---

## Verification

1. `cd frontend && bun run check:ci`
2. `cd backend && make check` (should be unchanged)
3. Smoke test:
   - `/project/[id]` → workspace canvas (not tabs)
   - Top header: name, client, location, summary, coverage bar
   - Base fields edit → autosave → "Saved"
   - Files button → full-screen files → back to workspace
   - Contacts → navigates to location page
   - Evidence upload → list updates with status
   - Context note → autosave
   - Refresh Insights → derived updates → modal if proposals
   - Confirm proposals → custom fields render
   - Cancel → no fields created
   - Mobile: stacks cleanly

## Resolved Decisions

1. **Primary contact** → omitted v1. Not well-modeled yet. Don't derive from location contacts.
2. **Discovery Complete** → disabled button, deferred to v2.
3. **Contacts link** → `useLocationStore.loadLocation(locationId)` for `companyId`.
4. **viewMode** → only `"workspace" | "files"`. Proposals not migrated.
5. **Missing information** → deferred. Placeholder at most.
6. **Component granularity** → start with fewer files, extract during implementation as needed.
