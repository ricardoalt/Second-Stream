# Tasks: ai-discovery-multi-scope

## Phase 1: Wizard simplification

- [x] 1.1 [RED] Add/update wizard tests in `frontend/components/features/discovery-wizard/...` proving upload+analyze works without scope state; no `none|client|client+location` branches.
- [x] 1.2 [GREEN] Remove wizard scope UI/state from `frontend/components/features/discovery-wizard/views/idle-view.tsx`, `use-discovery-orchestration.ts`, and discovery API types/contracts.
- [x] 1.3 Recheck `backend/app/services/discovery_session_service.py` and related schemas/models for any pre-scope coupling; trim only AI-discovery-specific branching, keep Quick Entry untouched.

## Phase 2: Confirm-only resolution flow

- [x] 2.1 [RED] Add modal tests in `frontend/components/features/discovery/draft-confirmation-modal.tsx` for unresolved suggestions, sequential client→location gating, and blocked incomplete drafts.
- [x] 2.2 [GREEN] Implement modal resolution state: app-side matching/dedup, batch auto-apply of repeated `suggested_client_name`, and resolved vs suggested draft fields.
- [x] 2.3 [GREEN] Keep create-new client/location flows working in the modal, scoped to resolved client for locations.

## Phase 3: Backend alignment + cleanup

- [x] 3.1 [RED] Add/adjust backend session tests for organization entrypoint, nullable scope fields, and draft-finalize blocking in `backend/tests/...`.
- [x] 3.2 [GREEN] Simplify backend session creation/finalization where AI discovery still depends on pre-scope assumptions; preserve useful nullable/organization behavior.
- [x] 3.3 Remove dead code, stale scope-mode branches, and any docs/comments that still imply wizard preselection; do not redesign Quick Entry.

## Phase 4: Verification

- [x] 4.1 Add focused verify coverage for confirm-only AI discovery: wizard start, modal matching, auto-apply, create-new, and incomplete-draft blocking.
- [x] 4.2 Re-run file-level sanity checks on touched frontend/backend files and confirm no Quick Entry behavior changed.
