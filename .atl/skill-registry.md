# Skill Registry

## Project Conventions
- Repo docs are the source of truth; start with `AGENTS.md`.
- Canonical operational docs live in `docs/agents/`.
- Stack: FastAPI backend, Next.js frontend, Terraform infra.
- Backend commands live in `backend/Makefile`; frontend commands live in `frontend/package.json`.

## Referenced Docs
- `AGENTS.md`
- `CLAUDE.md`
- `docs/agents/README.md`
- `docs/agents/development-commands.md`
- `docs/agents/architecture.md`
- `docs/agents/code-style.md`

## Relevant Skills
- `sdd-init` — SDD bootstrap and persistence.
- `shadcn` — UI component registry and shadcn/ui work.
- `tailwind-4` — Tailwind v4 styling conventions.
- `vercel-react-best-practices` — React/Next.js performance patterns.
- `architecture-patterns` — backend architecture guidance when refactoring flows.
- `supabase-postgres-best-practices` — Postgres/schema/query guidance when needed.

## Notes
- No project-local skill registry existed before this init.
- Testing is available in both stacks, with strong backend pytest coverage and frontend Biome checks.
