# Proposal: clients-company-backed-foundation

## Context
Clients UI is now backend-connected around `Company` data, but this change still carried a dead `AddNewClientModal` artifact and incomplete SDD traceability artifacts.

## Problem
- `frontend/components/features/modals/add-new-client-modal.tsx` remained in-repo while no active route imports or mounts it.
- SDD artifact set for this change was incomplete (`design.md` existed, but proposal/spec/tasks were missing in tracked artifacts).

## Scope (warning-cleanup pass)
1. Formally decommission and remove the dead Add Client modal artifact.
2. Re-sync SDD artifacts for this change so proposal/spec/tasks/design are all present and internally consistent.

## Non-Goals
- Do not implement or reintroduce Add Client creation flow.
- Do not expand Clients product scope beyond current backend-backed foundation.
- Do not add Admin Communication work.

## Success Criteria
- No dead Add Client modal component remains in the frontend codebase.
- `docs/sdd/clients-company-backed-foundation/{proposal,spec,tasks,design}.md` exist and align on the same bounded scope.
- Matching SDD artifacts are persisted in Engram under:
  - `sdd/clients-company-backed-foundation/proposal`
  - `sdd/clients-company-backed-foundation/spec`
  - `sdd/clients-company-backed-foundation/tasks`
  - `sdd/clients-company-backed-foundation/design`

## Risks
- Minimal: deleting a dead file can break builds only if hidden imports exist.
- Mitigation: run targeted frontend lint after cleanup.
