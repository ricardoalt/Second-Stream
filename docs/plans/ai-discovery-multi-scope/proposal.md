# Proposal: AI Discovery Multi-Scope

## Intent
The current discovery wizard strictly requires a preselected single client and location before analysis can start. This blocks users who have bulk documents spanning multiple locations or clients. The previous approach of adding pre-scope options (`none`, `client`, `client+location`) to the wizard has been discarded to reduce cognitive load. Instead, the wizard will become a pure "upload + analyze" flow. All client and location resolution will be deferred to the final draft confirmation modal, where the AI can suggest names, but the user must map them to actual database entities.

## Scope

### In Scope
- Remove the client/location selection completely from the discovery wizard (pre-scope is discarded).
- The wizard becomes a general "upload + analyze" step.
- The AI infers and suggests `client` and `location` string names from the documents.
- The application (frontend/backend) matches these suggestions against the database (matching/deduplication is app-side, not delegated to AI).
- The AI never creates new entities autonomously.
- The final confirmation modal enforces that `client` and `location` are mandatory before saving a real waste stream.
- The modal allows users to resolve suggested clients to real entities.
- **Auto-apply resolution:** If a user resolves a suggested client (e.g., "INDORAMA") to a real entity in one draft, that resolution auto-applies to all other drafts in the same batch with the exact same suggestion.
- Location resolution happens strictly *after* client resolution and within the scope of the resolved client.
- Block draft confirmation if `client` or `location` remains unresolved.

### Out of Scope
- Pre-scope options in the wizard (`none`, `client`, `client+location`) are explicitly discarded.
- Delegating entity matching/creation entirely to the AI model.
- Dedicated left/right split panels in the final modal.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `discovery-wizard`: Remove client/location selection, making it a pure upload flow.
- `discovery-confirmation`: Add sequential resolution (client -> location) with auto-apply for identical suggestions across the batch.

## Approach
We will simplify the frontend `discovery-wizard` by removing the client and location inputs entirely. The AI pipeline will extract suggested strings for `client` and `location`. In the `draft-confirmation-modal`, we will introduce a strict resolution flow: the user must first map the suggested client string to an existing DB client (or explicitly create it). Once mapped, the location must be mapped to a valid location under that client. To improve UX, resolving a suggested client string will cascade that resolution to all other drafts in the batch that share the same suggested string.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/features/discovery-wizard/views/idle-view.tsx` | Modified | Remove client/location inputs, leaving just upload. |
| `frontend/components/features/discovery-wizard/use-discovery-orchestration.ts` | Modified | Update to expect zero initial scope. |
| `frontend/components/features/discovery/draft-confirmation-modal.tsx` | Modified | Add sequential resolution (client then location) and auto-apply logic. |
| `frontend/lib/types/discovery.ts` | Modified | Support suggested vs resolved entity states for drafts. |
| `backend/app/services/discovery_session_service.py` | Modified | Accommodate AI suggestions for client/location without enforcing initial scope. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User fatigue resolving many clients/locations | Medium | The auto-apply logic for identical suggestions significantly reduces manual clicks. |
| AI hallucinating inconsistent client names | Medium | Standardize AI extraction prompts to prefer exact strings from documents; app-side fuzzy matching can help. |

## Rollback Plan
Revert `idle-view.tsx` to restore the strict pre-scope selection, and revert `draft-confirmation-modal.tsx` to remove the resolution and auto-apply logic.

## Dependencies
- Existing entity creation endpoints (if user needs to create new client/location from modal).

## Success Criteria
- [ ] Users can upload documents without selecting any client or location.
- [ ] The final modal clearly shows AI-suggested clients and locations.
- [ ] Resolving a suggested client auto-applies to all drafts with the same suggestion.
- [ ] Users cannot confirm a draft until both client and location are explicitly resolved.
- [ ] Location options are filtered by the resolved client.