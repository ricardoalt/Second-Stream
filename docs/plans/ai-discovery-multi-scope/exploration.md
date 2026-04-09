## Exploration: ai-discovery-multi-scope

### Current State
The discovery wizard is centered in `frontend/components/features/discovery-wizard/discovery-wizard.tsx` and `use-discovery-orchestration.ts`. Today the idle step still requires a single preselected `companyId + locationId` to start discovery (`canStartDiscovery`, `getDiscoveryBlockedReason`, `startDiscovery`). The analysis pipeline creates a discovery session for one company, uploads files/audio/text, polls backend status, then maps `DraftItemRow[]` into `DraftCandidate[]` with a fallback `defaultCompanyId/defaultLocationId` during review.

Final confirmation happens in `frontend/components/features/discovery/draft-confirmation-modal.tsx`, which only edits stream fields (material/volume/frequency/units). Client/location are not editable there. Confirmation uses `bulkImportAPI.decideDiscoveryDraft(...)` plus optional `locationResolution`, but the current UX only passes `existing` resolution when `candidate.locationId` exists or falls back to the session default location. Drafts vs real waste streams are mediated through `ImportItem` / `DiscoverySession` backend state and confirmation/reject flows in `backend/app/services/bulk_import_service.py` and `backend/app/services/discovery_session_service.py`.

### Affected Areas
- `frontend/components/features/discovery-wizard/views/idle-view.tsx` — hard gate on single client + location before discovery starts.
- `frontend/components/features/discovery-wizard/use-discovery-orchestration.ts` — session creation, polling, draft mapping, and default location propagation.
- `frontend/components/features/discovery-wizard/discovery-wizard.tsx` — wires the wizard phases and the review modal.
- `frontend/components/features/discovery/draft-confirmation-modal.tsx` — final confirmation/editing UI; currently no client/location selectors.
- `frontend/lib/types/discovery.ts` — draft/session types; candidate currently carries nullable clientId/locationId only.
- `frontend/lib/discovery-confirmation-utils.ts` — confirmation payload/notes builder; no client/location resolution logic.
- `frontend/lib/api/bulk-import.ts` — supports `locationResolution` payloads for confirmation.
- `backend/app/services/discovery_session_service.py` — session lifecycle, summary counts, and run creation from discovery sources.
- `backend/app/services/bulk_import_service.py` — existing location resolution and finalize-time entity creation/linking.
- `backend/tests/test_discovery_sessions.py`, `backend/tests/test_bulk_import.py` — important behavioral references for location counting and location resolution.

### Coupling to single client/location
- Idle wizard blocks start unless both `companyId` and `locationId` are present.
- `startDiscovery()` persists a single `locationId` in resume state and later feeds it back as `defaultLocationId`.
- Candidate mapping fills `clientId` from row/company fallback and `locationId` from either `row.target.entrypointType === "location"` or the one default location.
- Confirmation payload only knows how to resolve to one existing location; there is no client/location inference workflow in the modal.
- Review modal copy and candidate model are stream-first, not scope-first; location is just metadata.

### Previous / partial location-linking base
- `backend/app/services/bulk_import_ai_extractor.py` already emits `location_confidence` and `location_evidence` when AI can associate a stream with a location.
- `backend/app/services/bulk_import_service.py` already consumes location-aware parsed rows, groups by location, dedupes by location identity, and links project drafts to locations through parent-item and finalize-time resolution.
- `backend/tests/test_discovery_sessions.py` has summary cases proving location counting is derived from linked location parent items and can be zero for orphan drafts.
- `backend/tests/test_bulk_import.py` has many `locationResolution` scenarios, including existing-location reuse and create-new finalize behavior.
- `frontend/lib/types/dashboard.ts` already models `DraftConfirmationLocationState` with `locked | existing | create_new`, which is the closest existing UI contract for resolution editing.

### End-to-end flow today
1. User opens discovery wizard.
2. Idle view collects source files/audio/text plus a single company/location pair.
3. Frontend creates a discovery session for that company, uploads sources, starts processing.
4. Backend converts discovery sources into an import run tied to the company.
5. AI extraction stages rows into draft items; some rows may already carry location hints in backend parsed data.
6. Frontend polls session status until `review_ready` / terminal.
7. Frontend fetches draft rows, maps them into `DraftCandidate[]`, and opens the final confirmation modal.
8. User edits stream fields, confirms/rejects drafts, and the frontend posts `decideDiscoveryDraft` requests.
9. Backend finalizes real waste streams (and, in bulk-import flows, can resolve or create locations at finalize time).

### Options
1. **Scope-aware wizard inputs + final resolver modal** — keep the current single-client/location start path, but add a new pre-analysis scope selector that can be `none | client | client+location`, and extend the final confirmation modal to resolve missing client/location with the existing company/location selects plus create-new actions.
   - Pros: smallest surface-area change; preserves current workflow; easy to reason about; reuses existing selects and location resolution contracts.
   - Cons: some duplication between start-time scope helpers and final review resolution.
   - Effort: Medium.

2. **Unified AI-discovery scope model end-to-end** — introduce a richer discovery scope object that flows from idle input through session creation, candidate mapping, and final confirmation.
   - Pros: clearer domain model; easier to support future multi-company discovery behaviors.
   - Cons: larger refactor; touches more files/tests; higher chance of accidental coupling.
   - Effort: High.

3. **Backend inference-first, frontend fallback-only** — make the backend infer client/location from mixed evidence first, and use the modal only when confidence is low.
   - Pros: maximal AI leverage; less frontend branching if inference is strong.
   - Cons: risky/opaque UX; harder to debug; more likely to overfit to AI confidence thresholds.
   - Effort: High.

### Recommendation
Take option 1. Keep the existing single-client/location start flow intact, but generalize it to explicit scope modes (`none`, `client`, `client+location`) and let AI use those as soft filters rather than hard requirements. Then extend the final confirmation modal to resolve ambiguous or missing client/location using existing selectors and create-new affordances. This is the cleanest path that reuses current contracts, keeps the analysis pipeline simple, and avoids a broad rewrite of discovery/session plumbing.

### Risks
- If candidate mapping keeps assuming one default location, mixed-file / multi-location evidence will still collapse incorrectly.
- The final modal may become too dense if client/location resolution is bolted on without a dedicated left/right scope panel.
- The backend already has location-aware parsing in bulk-import; discovery-specific candidate mapping may need a thin normalization layer to avoid duplicating logic.
- There is no `openspec/` tree in the repo right now, so the next phase needs a doc-location decision before writing proposal/spec artifacts.

### Ready for Proposal
Yes — proposal can start now. Recommended artifact path for the next phase is `docs/sdd/ai-discovery-multi-scope/` (current repo convention). If an `openspec/` tree is introduced separately, mirror the same `proposal.md`, `design.md`, `spec.md`, and `tasks.md` there; otherwise keep the canonical docs under `docs/sdd/ai-discovery-multi-scope/`.
