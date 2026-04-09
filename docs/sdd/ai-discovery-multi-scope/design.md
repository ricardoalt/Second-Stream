# Design: ai-discovery-multi-scope

## Technical Approach

AI Discovery will move exclusively to a confirm-only resolution model. The wizard will no longer manage scope pre-selection (`none`, `client`, `client+location`); it will purely orchestrate uploads and analysis.
All resolution of `client` and `location` for waste streams will happen client-side in the final confirmation modal before saving to the database. AI will only provide suggestions, and the app will handle matching them against existing database entities.

### Retained vs. Discarded Architecture

**Discarded / Simplified:**
- Pre-selection of `client` and `location` in the Discovery Wizard is removed. The wizard no longer needs state for `none|client|client+location` modes.
- Any backend constraints or complex routing logic built solely for `client` vs `none` vs `client+location` pre-scope validation during session creation can be simplified or removed.
- `canStartDiscovery` logic is simplified to only require valid sources.
- No AI-led entity creation.

**Retained:**
- Making `company_id` nullable in `DiscoverySession` and `VoiceInterview`.
- `location_id` on `DiscoverySession` (nullable).
- Setting `ck_import_runs_entrypoint_type` to include `'organization'` since AI Discovery sessions inherently start organization-wide until resolved.
- Quick Entry remains unchanged (requires explicit client/location before entering).
- Reusing existing bulk import selectors and create-new flows in the confirmation modal.

## Architecture Decisions

### Decision: Simplified Session Creation
**Choice**: The wizard will create `DiscoverySession` instances with null `company_id` and null `location_id`, generating an `ImportRun` with `entrypoint_type="organization"`.
**Alternatives considered**: Retaining the UI for optional client selection in the wizard.
**Rationale**: The spec mandates a strictly confirm-only model for AI Discovery. Removing wizard-level scope reduces user cognitive load upfront and centralizes all matching logic in the confirmation modal.

### Decision: Draft State Model & Auto-apply
**Choice**: Each draft in the confirmation modal will track `suggested_client_name` and `suggested_location_name` (from AI), separate from `resolved_client_id` and `resolved_location_id` (from the user/app). Auto-apply will occur in the React state: when a user sets a `resolved_client_id` for a draft, the UI will find all other drafts in the batch with the exact same `suggested_client_name` and no existing `resolved_client_id`, applying the same resolution to them.
**Alternatives considered**: Having the backend perform the auto-apply logic.
**Rationale**: Doing this client-side provides immediate feedback and keeps the backend API stateless regarding intermediate draft resolution.

### Decision: App-side Matching and Deduplication
**Choice**: Client-side (React query/cache) will fetch available clients and locations. When rendering drafts, the UI will attempt to pre-match `suggested_client_name` against the cached list (case-insensitive, basic similarity). If a match is found, it will propose it but require the user to confirm it.
**Alternatives considered**: Forcing the AI to use an embedding search to map strictly to database IDs.
**Rationale**: AI hallucination or slightly mismatched names (e.g. "Acme Corp" vs "Acme Corp.") could cause silent incorrect mapping or entity duplication. App-side fuzzy matching is safer and gives control back to the user before confirmation.

## Data Flow

```text
User (Wizard) ──(files/audio only)──→ POST /api/v1/discovery-sessions (company_id=null, location_id=null)
     │
     └──→ DiscoverySession (draft)
            ├── ImportRun (entrypoint_type=organization)
            └── VoiceInterview (company_id=null)
                 │
           AI Extractor (returns `suggested_client_name`, `suggested_location_name`)
                 │
                 v
           Draft Candidates
                 │
           Confirmation Modal
            ├── 1. App-side matching proposes DB entities for suggestions
            ├── 2. User resolves Client (auto-applies to matching suggestions in batch)
            ├── 3. User resolves Location (filtered by resolved Client)
            └── 4. User can Create New Client/Location if no match exists
                 │
           Finalize ──(resolved_client_id, resolved_location_id)──→ DB (Waste Streams Created)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/discovery_session.py` | Retain/Modify | Keep `company_id` nullable and `location_id` nullable |
| `backend/app/models/voice_interview.py` | Retain/Modify | Keep `company_id` nullable |
| `backend/app/models/bulk_import.py` | Retain | Keep `ck_import_runs_entrypoint_type` including `'organization'` |
| `backend/app/services/discovery_session_service.py` | Simplify | Remove complex pre-scope validation logic. All AI sessions are organization-scoped by default |
| `frontend/components/features/discovery-wizard/views/idle-view.tsx` | Simplify | Remove client/location selectors |
| `frontend/components/features/discovery-wizard/use-discovery-orchestration.ts` | Simplify | Remove pre-scope state and validation (`none|client|client+location` modes removed) |
| `frontend/lib/api/discovery-sessions.ts` | Modify | Simplify payload types to remove mandatory scope types for discovery |
| `frontend/components/features/discovery/draft-confirmation-modal.tsx` | Modify | Implement app-side matching, auto-apply logic by `suggested_client_name`, and strictly enforce client then location resolution |

## Interfaces / Contracts

```typescript
// Minimum state model per draft in Confirmation Modal
interface DraftCandidateState {
    // From AI
    suggested_client_name?: string;
    suggested_location_name?: string;

    // From User / App-side matching
    resolved_client_id: string | null;
    resolved_location_id: string | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Frontend) | Auto-apply logic | Given a batch of drafts, resolving a client for one applies the same ID to others with the exact `suggested_client_name` |
| Unit (Frontend) | Location gating | Verify location selector is disabled/hidden until `resolved_client_id` is present |
| Integration (Backend) | Nullable Scope | Verify session creates successfully with null client/location |
| E2E | Wizard to Finalize | Upload -> AI extracts suggestions -> User resolves one client (auto-applies) -> User resolves locations -> Confirm creates waste streams |

## Migration / Rollout

No data migration required as the `company_id` and `location_id` nullability constraint loosening remains valid. Feature flags are not required since we are removing unused pre-scope UI and enforcing confirmation safety.

## Open Questions

- None
