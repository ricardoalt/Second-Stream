## Development Commands

Prefer these references instead of copying commands into `AGENTS.md`.

### Full stack
- Start backend services (FastAPI + PostgreSQL + Redis + intake worker): `cd backend && docker-compose up`
- Start frontend dev server (Turbopack hot reload): `cd frontend && bun run dev`
- Run database migrations: `cd backend && docker-compose exec app alembic upgrade head`

### Backend

**No local setup required.** All tooling runs via Docker.

#### Code Quality (Local - ruff)
Requires: `uv tool install ruff` (one-time)

- Full check (auto-fix + format): `cd backend && make check`
- Lint only: `cd backend && make lint`
- Lint with auto-fix: `cd backend && make lint-fix`
- Format: `cd backend && make format`

#### Tests (Docker)
Requires: `docker compose up -d postgres redis`

- Run all tests: `cd backend && make test`
- Tests with coverage: `cd backend && make test-cov`
- Single test file: `cd backend && make test-file FILE=tests/test_auth.py`

#### Old commands (deprecated)
- `make install-dev`: **Removed** - no longer needed
- `make typecheck`: **Removed** - use ruff for linting
- `make check-ci`: **Removed** - use `make check`

### Frontend
- Full code quality (CI mode): `cd frontend && bun run check:ci`
- Full check (auto-fix): `cd frontend && bun run check`
- Auto-fix lint issues: `cd frontend && bun run lint:fix`
- Format: `cd frontend && bun run format`
- Production build: `cd frontend && bun run build`

### Infrastructure
- Work from `infrastructure/terraform/prod`
- Plan: `terraform plan`
- Apply: `terraform apply`
- Show state: `terraform show`
