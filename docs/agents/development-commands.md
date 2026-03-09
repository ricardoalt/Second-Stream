## Development Commands

Prefer these references instead of copying commands into `AGENTS.md`.

### Full stack
- Start backend services (FastAPI + PostgreSQL + Redis + intake worker): `cd backend && docker-compose up`
- Start frontend dev server (Turbopack hot reload): `cd frontend && bun run dev`
- Run database migrations: `cd backend && docker-compose exec app alembic upgrade head`

### Backend
Prerequisites: `cd backend && make install-dev` (one-time setup for local tooling)

Tooling stack:
- **Ruff**: Linter + formatter (replaces Black, isort, flake8)
- **ty**: Type checker (replaces Pyright/Mypy, 10-100x faster)

- Full check (auto-fix + format + typecheck): `cd backend && make check`
- CI mode (verify only, no changes): `cd backend && make check-ci`
- Lint only: `cd backend && make lint`
- Lint with auto-fix: `cd backend && make lint-fix`
- Format: `cd backend && make format`
- Type checks: `cd backend && make typecheck`
- Tests (requires docker compose up): `cd backend && make test`
- Tests with coverage: `cd backend && make test-cov`
- Single test file: `cd backend && make test-file FILE=tests/test_location_contacts.py`

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
