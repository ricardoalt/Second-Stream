# Dashboard Triage Redesign - Atomic Tasks

Date: 2026-03-09
Source: `docs/plans/2026-03-09-dashboard-triage-redesign-implementation-spec.md`
Scope: dashboard redesign only

## 0. Shared contract lock

### T0.1 - Lock dashboard API shape
- Output: single agreed dashboard response contract for counts, rows, filters, pagination
- Include:
  - bucket ids: `total`, `needs_confirmation`, `missing_information`, `intelligence_report`, `proposal`
  - row kinds: `persisted_stream`, `draft_item`
  - filters: `search`, `company_id`, `archived`, `proposal_follow_up_state`, pagination
  - counts scoped by same filters as list
- Depends on: spec only

### T0.2 - Lock navigation targets
- Output: agreed frontend route contract for:
  - persisted stream -> workspace
  - draft item -> confirmation flow entrypoint
- Constraint: do not hardcode current company-page host into dashboard product model
- Depends on: T0.1

## 1. Backend tasks

### T1.1 - Add dashboard-specific schemas
- Files:
  - `backend/app/schemas/project.py`
  - optionally new dashboard schema module if cleaner
- Output:
  - bucket count schema
  - discriminated dashboard row schema
  - dashboard list/summary response schema
- Constraint: do not overload legacy `DashboardStatsResponse`
- Depends on: T0.1

### T1.2 - Add stream-level proposal follow-up field
- Files:
  - `backend/app/models/project.py`
  - `backend/alembic/versions/*`
  - `backend/app/schemas/project.py`
- Output:
  - nullable stream-level proposal commercial state
  - allowed values: `uploaded`, `waiting_to_send`, `waiting_response`, `under_negotiation`, `accepted`, `rejected`
- Constraint: keep `Proposal.status` as document/version lifecycle only
- Depends on: T0.1

### T1.3 - Implement persisted-stream dashboard projection
- Files:
  - `backend/app/api/v1/projects.py`
  - query helpers/service module if needed
- Output:
  - server projection for persisted streams with explicit fields for:
    - pending confirmation
    - missing required info
    - intelligence readiness
    - proposal follow-up state
    - company/location labels
    - volume/frequency summary
    - last activity / aging
- Constraint: do not derive from `project.status` alone
- Depends on: T1.1

### T1.4 - Implement staging-draft dashboard projection
- Files:
  - `backend/app/api/v1/bulk_import.py`
  - `backend/app/schemas/bulk_import.py`
  - query helpers/service module if needed
- Output:
- projection for draft preview rail
- projection for full `Needs confirmation` queue
- stable confirmation-flow target payload
- Include sources from bulk import + voice review staging
- confirmation target payload should be stable identifiers only, e.g. `target_kind`, `run_id`, `item_id`, `source_type`, `entrypoint_type`, `entrypoint_id`
- Depends on: T1.1, T0.2

### T1.5 - Add dedicated dashboard endpoint(s)
- Files:
  - `backend/app/api/v1/projects.py`
  - `backend/app/schemas/project.py`
- Output:
- dedicated dashboard endpoint(s) for counts + rows
- filters respected consistently across counts and list
- keep legacy `/projects` and `/projects/stats` backward-compatible in this phase
- Rules:
  - company filter hides drafts without company assignment
  - archived filter applies only to persisted streams
  - search applies after bucket/filter scoping
  - authz and org scoping must match existing project/bulk-import access rules
- Depends on: T1.3, T1.4

### T1.6 - Add proposal follow-up transition endpoint
- Files:
  - `backend/app/api/v1/projects.py`
  - `backend/app/schemas/project.py`
- Output:
- stream-level state transition endpoint
- transition validation rules
- explicit transition graph and invalid transition behavior (`409`) locked in code/tests
- Constraint: endpoint ownership stays with stream/project domain, not proposal version domain
- Depends on: T1.2

### T1.7 - Add timeline audit for commercial state changes
- Files:
  - `backend/app/services/timeline_service.py`
  - `backend/app/api/v1/projects.py`
  - related tests
- Output:
  - timeline event emitted for each proposal commercial state transition
  - metadata includes old/new state and actor
- Depends on: T1.6

### T1.8 - Add backend tests for dashboard projection
- Files:
  - `backend/tests/test_projects.py`
  - `backend/tests/test_bulk_import.py`
  - `backend/tests/test_voice_interviews.py`
- Output:
  - tests for bucket counts/list consistency
  - tests for `persisted_stream` vs `draft_item`
  - tests for company filter hiding unassigned drafts
  - tests for archived filter semantics
  - tests for readiness bucket logic
- Depends on: T1.5

### T1.9 - Add backend tests for proposal follow-up workflow
- Files:
  - `backend/tests/test_projects.py`
  - new test module if cleaner
- Output:
  - valid transitions
  - invalid transitions rejected
  - timeline event written
- Depends on: T1.6, T1.7

## 2. Frontend tasks

### T2.1 - Replace dashboard page shell
- Files:
  - `frontend/app/dashboard/page.tsx`
  - new components under `frontend/components/features/dashboard/components/`
- Output:
  - header with search/filters/CTA
  - bucket tabs
  - primary table area
  - right rail draft preview in `Total Waste Streams`
- Depends on: T0.1

### T2.2 - Add dashboard-specific frontend types
- Files:
  - `frontend/lib/project-types.ts`
  - new dashboard types module if cleaner
- Output:
  - bucket type
  - discriminated row type
  - dashboard response types
- Depends on: T0.1

### T2.3 - Add dashboard API client methods
- Files:
  - `frontend/lib/api/projects.ts`
  - `frontend/lib/api/bulk-import.ts` only if needed
- Output:
  - dedicated fetch methods for dashboard counts/list
  - request params aligned with backend filters
- Depends on: T1.5

### T2.4 - Refactor store for dashboard projection
- Files:
  - `frontend/lib/stores/project-store.ts`
- Output:
  - dashboard state for counts/list/filters
  - no dependency on legacy dashboard stats contract
- Depends on: T2.2, T2.3

### T2.5 - Build bucket-specific views
- Files:
  - new dashboard components
- Output:
  - `Total Waste Streams` view
  - `Needs confirmation` queue
  - `Missing information` queue
  - `Intelligence Report` queue
  - `Proposal` queue + subfilters
- Depends on: T2.1, T2.4

### T2.6 - Wire navigation targets
- Files:
  - `frontend/lib/routes.ts`
  - `frontend/app/dashboard/page.tsx`
- Output:
  - persisted stream rows open workspace
  - draft rows open confirmation flow entrypoint
- Depends on: T0.2, T2.5

### T2.7 - Add proposal bucket UI
- Files:
  - new dashboard components
  - `frontend/lib/types/proposal-ui.ts`
- Output:
  - proposal state badges
  - subfilters
  - workspace quick action
- Constraint: read-only in dashboard for this phase
- Depends on: T1.2, T2.5

### T2.8 - Add frontend tests
- Files:
  - new dashboard tests
- Output:
  - bucket switch coverage
  - row-kind rendering coverage
  - draft navigation coverage
  - company filter hides unassigned drafts
- Depends on: T2.6, T2.7

## 3. Deletion / cleanup tasks

### T3.1 - Remove obsolete dashboard components
- Files:
  - `frontend/components/features/dashboard/components/dashboard-hero.tsx`
  - `frontend/components/features/dashboard/components/project-pipeline.tsx`
  - `frontend/components/features/dashboard/components/simplified-stats.tsx`
  - `frontend/components/features/dashboard/components/project-card.tsx`
  - `frontend/components/features/dashboard/index.ts`
- Output:
  - dead hero/pipeline/stats/card exports removed or replaced
- Depends on: T2.5

### T3.2 - Remove legacy dashboard stats wiring
- Files:
  - `frontend/lib/stores/project-store.ts`
  - `frontend/lib/api/projects.ts`
  - `backend/app/schemas/project.py`
  - `backend/app/api/v1/projects.py`
- Output:
  - legacy dashboard stats contract removed or fully deprecated
- Depends on: T1.5, T2.4

### T3.3 - Remove old dashboard-specific status heuristics
- Files:
  - `frontend/lib/project-status.ts`
  - `frontend/lib/hooks/use-notifications.ts`
- Output:
  - delete or isolate old progress/status-based dashboard heuristics
- Depends on: T2.5

## 4. Recommended execution order

1. `T0.1`
2. `T0.2`
3. `T1.1`
4. `T1.2`
5. `T1.3`
6. `T1.4`
7. `T1.5`
8. `T2.2`
9. `T2.3`
10. `T2.4`
11. `T2.1`
12. `T2.5`
13. `T2.6`
14. `T1.6`
15. `T1.7`
16. `T2.7`
17. `T1.8`
18. `T1.9`
19. `T2.8`
20. `T3.1`
21. `T3.2`
22. `T3.3`

## 5. Backend handoff boundary

Backend agent owns:
- schemas
- migrations
- API endpoints
- query/projection logic
- transition validation
- timeline audit
- backend tests

Frontend agent owns:
- dashboard UI shell
- table/rail/components
- client-side types/store wiring
- route integration
- frontend tests

Shared boundary:
- exact response contract from `T0.1`
- confirmation-flow target contract from `T0.2`
