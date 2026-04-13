## Architecture Details

### Request flow (AI proposal generation)
1) User clicks "Generate" in React UI.
2) `POST /api/v1/ai/proposals/generate` returns `jobId`.
3) Background FastAPI job (~60-120s) loads `project.project_data` (JSONB) → `FlexibleWaterProjectData`.
4) Steps: filter proven cases (`intelligent_case_filter`), mass balances (deterministic formulas), design treatment train, size reactors (`engineering_calculations` tool), validate regulations, compute CAPEX/OPEX, produce `ProposalOutput` (Pydantic).
5) Frontend polls `GET /api/v1/ai/proposals/jobs/{jobId}` and renders with Recharts.

### Data model pattern
- Core tables: User, Project (metadata), Proposal (versions), ProjectFile, TimelineEvent.
- Dynamic data: `project.project_data` JSONB for flexible technical sections/fields.
- Workspace v1 backend hangs off `project.project_data["workspace_v1"]` for fixed base fields, persisted custom fields, derived insights; evidence stays in `ProjectFile`, context note stays in `IntakeNote`.
- Stream identity is canonical on `Project.name`; `workspace_v1.base_fields.material_name` is workspace-local data only (manual create seeds it once as convenience prefill).
- Workspace evidence AI path is single-stage: each `ProjectFile.ai_analysis` stores `summary` + `proposals[]` (base/custom target, answer, confidence, evidence refs); workspace refresh reads those proposals directly (no second workspace-insights agent layer).
- Dashboard triage is a dedicated projection layered on top of `Project` plus staging drafts from `ImportRun`/`ImportItem`; stream-level commercial follow-up lives on `Project.proposal_follow_up_state`, while `Proposal.status` remains version lifecycle only.
- Workspace completion handoff is now real: `POST /api/v1/projects/{id}/workspace/complete-discovery` persists completion, seeds Offer insights, and returns immediate Offer-detail navigation context rooted in `projectId`.
- Offers are backed by existing `Project` + `Proposal` truth, not a separate backend entity: active pipeline/detail read from project-scoped projections and `ProjectDetail`; detail transitions persist through `PATCH /api/v1/projects/{id}/proposal-follow-up-state`.
- Offer detail contract (`GET /api/v1/projects/{id}/offer`) is offer-first and includes `streamSnapshot` (workspace base fields), `insights`, `followUpState`, and single-file `offerDocument` metadata.
- Offers Archive is a separate read-only projection over archived projects plus terminal follow-up semantics. Public archive labels are `accepted` / `declined`, with legacy backend `rejected` normalized at the contract boundary.
- Discovery wizard orchestration uses `DiscoverySession` + `DiscoverySource` as lightweight intake fan-out, then hands off to existing `ImportRun`/`ImportItem` draft pipeline for `Needs Confirmation`.
- Company lifecycle is unified on `companies.account_status` with two states: `lead` (default on creation) and `active` (set automatically by backend after first successful stream/project creation). `lead`/`active` is separate from archived visibility (`archived_at` filter).

### Discovery wizard semantics
- Discovery can ingest multi-source in one session (`file` + `audio` + `text`), then stage draft candidates in bulk-import items.
- At this stage, discovery output is draft/candidate only. It is not a persisted waste-stream until user confirm/finalize creates `Project`.
- Result modal metrics are session-scoped and intentionally simple:
  - `Waste-streams found`: count of project draft items in session runs where `item_type=project`, `created_project_id IS NULL`, `status IN (pending_review, accepted, amended)`.
  - `Locations found`: distinct normalized `name|city|state` fingerprints from location items linked via `parent_item_id` to those project drafts.
- Location-only detections do not inflate modal `Locations found`; locations are used as prefill context inside each stream draft.
- Result modal also renders `sources analyzed` from `DiscoverySession.sources` (friendly status labels), so users can verify what was processed.

### Discovery provenance strategy
- On project materialization from discovery draft paths (per-item decision confirm, finalize, subset finalize), backend writes provenance metadata to `project.project_data.workspace_v1.provenance`.
- Minimal provenance payload:
  - `origin = ai_discovery`
  - `run_id`
  - `discovery_session_id` (if available)
  - `source_type`
  - `source_filename`
  - `discovery_source_id` (if available)
- Non-goal for now: no automatic `ProjectFile` creation or file copy from discovery sources. Provenance is metadata only.

#### Database relationships
```
User ──1:N──> Project ──1:N──> Proposal
                      ├──1:N──> ProjectFile
                      └──1:N──> TimelineEvent
```

### Authentication flow
1) `POST /auth/register` → bcrypt hashed password.
2) `POST /auth/jwt/login` → JWT (24h).
3) Frontend stores token (localStorage); all requests use `Authorization: Bearer <token>`.
4) FastAPI Users middleware validates JWT.

### Frontend state
- Zustand stores with localStorage persistence.
- Core stores: `frontend/lib/stores/project-store.ts`, `frontend/lib/stores/technical-data-store.ts`.
- API pattern: `frontend/lib/api/*.ts` classes → store updates (see `ProjectsAPI` usage).

### Key files
- **Backend**: `backend/app/core/config.py`, `backend/app/models/project.py`, `backend/app/agents/proposal_agent.py`, `backend/app/services/proposal_service.py`, `backend/app/api/v1/`
- **Frontend**: `frontend/lib/api/client.ts`, `frontend/lib/stores/project-store.ts`, `frontend/lib/stores/technical-data-store.ts`, `frontend/app/`, `frontend/components/features/`
- **Infra**: `infrastructure/terraform/prod/main.tf`, `backend/docker-compose.yml`
