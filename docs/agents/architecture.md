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
