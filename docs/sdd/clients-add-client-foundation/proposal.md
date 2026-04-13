# Proposal: clients-add-client-foundation

## Problem
`/clients` still lacks a real Add Client flow. The prior proposal deferred the Stitch "Shipping Location & Logistics Hub" block, but Product Engineering has now confirmed it MUST persist as the client's first real `Location`.

## Scope
- Enable the `/clients` Add Client CTA with a real create flow implemented as a dedicated modal surface visually matching the Stitch "Add New Client" modal.
- Persist one `Company` (including a new `account_status` lifecycle field constrained to `lead | active`, with new companies created as `lead`), one primary `CompanyContact`, and one first `Location` from the Stitch modal.
- Keep the flow sequential: create Company, then primary contact, then first Location.
- Add explicit recovery UX for partial failure; the flow is not atomic today.

## Non-Goals
- No separate address aggregate or fake logistics contract.
- No multi-location, multi-contact, or Edit Client expansion.
- No waste-stream creation here; Discovery Wizard remains the only waste-stream creation path.
- No Admin Communication or broader client-portfolio redesign.

## Approach
Use existing backend company/contact/location contracts directly. Map the modal's logistics block to the first real `Location`, not a deferred placeholder. On submit, create Company first, then primary contact, then first Location. If step 2 or 3 fails after Company succeeds, show partial-success state, explain exactly what saved, and route the agent into the new Client context to finish recovery manually rather than pretending the whole modal saved.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `docs/sdd/clients-add-client-foundation/proposal.md` | Modified | Re-scope proposal around real first-location persistence. |
| `frontend/app/(agent)/clients/page.tsx` | Modified | Enable Add Client entry + refresh after success/recovery. |
| `frontend/components/features/modals/` | New/Modified | Real Add Client modal aligned to Stitch fields. |
| `frontend/lib/api/{companies,locations}.ts` | Modified | Sequential create helpers for Company, contact, and Location. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Partial create leaves incomplete client | Med | Recovery UX with exact saved-state messaging and follow-up path. |
| Location semantics drift from product intent | Low | Persist only the first real `Location` confirmed by Product Engineering. |

## Rollback Plan
Re-disable Add Client entry points and remove modal submit wiring; existing Company/Contact/Location records remain valid and require no schema rollback.

## Acceptance Signals
- Agent can create a Client from `/clients` and see Company, primary contact, and first Location saved.
- The logistics block persists as the first real `Location`.
- Partial failures are surfaced clearly with recoverable next actions.
- No waste stream is created outside Discovery Wizard.

## Open Questions
- None.
