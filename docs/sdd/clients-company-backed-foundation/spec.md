# Spec: clients-company-backed-foundation

## Requirement 1 — Clients foundation remains backend-company-backed
The Clients portfolio (`/clients`) and Client profile (`/clients/[id]`) MUST remain aligned to backend `Company`-backed contracts and avoid mock-only intelligence fields.

### Scenario 1.1 — Portfolio uses backend company list
- **Given** the field agent opens `/clients`
- **When** the page loads
- **Then** the list is sourced from backend company APIs (not local client mock artifacts)
- **And** unsupported mock-only KPIs/intelligence are not introduced.

### Scenario 1.2 — Profile hydrates from company and project contracts
- **Given** the field agent opens `/clients/[id]`
- **When** profile data is requested
- **Then** the page uses backend company/project contracts for hydrated operations views
- **And** no fake timeline/intelligence contracts are fabricated.

## Requirement 2 — Add Client modal is explicitly out of scope
The change MUST NOT ship an inactive Add Client creation modal artifact.

### Scenario 2.1 — Dead Add Client modal artifact is removed
- **Given** Add Client creation flow is out of scope for this change
- **When** cleanup is applied
- **Then** `frontend/components/features/modals/add-new-client-modal.tsx` does not exist
- **And** no active route imports that modal.

### Scenario 2.2 — No Add Client flow reintroduction
- **Given** this pass is warning cleanup only
- **When** implementation is complete
- **Then** no new Add Client creation handler/modal flow is added anywhere in `(agent)` routes.

## Requirement 3 — SDD artifact completeness for archive-time verification
This change MUST have a complete SDD artifact set with traceable proposal/spec/tasks/design.

### Scenario 3.1 — Filesystem artifact completeness
- **Given** change `clients-company-backed-foundation`
- **When** docs are inspected
- **Then** proposal, spec, tasks, and design artifacts all exist under `docs/sdd/clients-company-backed-foundation/`.

### Scenario 3.2 — Engram artifact completeness
- **Given** archive-time verification depends on Engram records
- **When** artifact sync completes
- **Then** Engram contains all four keys for this change:
  `proposal`, `spec`, `tasks`, and `design`.
