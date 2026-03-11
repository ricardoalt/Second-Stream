# AGENTS.md

AI waste-opportunity platform: opportunities -> AI proposals -> compliance gates -> CRM/Marketplace sync.

## Purpose

- `AGENTS.md` is the top-level entrypoint and policy summary.
- Canonical operational guidance lives in `docs/agents/`.
- Repo markdown is system of record. Prefer repo docs over chat memory.

## Stack

- Monorepo: `backend/` (FastAPI), `frontend/` (Next.js), `infrastructure/` (Terraform)
- Package managers: `bun` (frontend), `uv` (backend)
- Early development, no users. Do things right: zero tech debt, no compatibility shims.

## Core Commands

- Backend: `cd backend && make check`
- Frontend: `cd frontend && bun run check:ci`

## Doc Precedence

- Source of truth order:
  1. `AGENTS.md`
  2. `docs/agents/*.md`
  3. active task plan in `docs/plans/`
  4. inline code comments

## Read By Task

- Start here if unsure: `docs/agents/README.md`
- Commands and setup: `docs/agents/development-commands.md`
- Feature workflow: `docs/agents/workflows.md`
- Architecture and key files: `docs/agents/architecture.md`
- Code style: `docs/agents/code-style.md`
- Debugging: `docs/agents/debugging.md`
- Environment: `docs/agents/environment-setup.md`
- Deployment: `docs/agents/deployment.md`
- Performance: `docs/agents/performance.md`
- Archive rules: `docs/archive/README.md`

## Working Rules

- Repo docs first. Use Context7 for unfamiliar, new, or changing external framework/library behavior.
- One fact, one home. Keep canonical guidance in one doc.
- If code changes commands, workflows, architecture, or setup, update the matching canonical doc in the same change.

## Plan Mode

- Keep plans extremely concise. Sacrifice grammar for concision.
- End each plan with unresolved questions, if any.
- After you finalize a plan, spin up a subagent to review it, then refine if useful.

## Subagents

- ALWAYS wait for all subagents to complete before yielding.
- Use subagents for isolated, parallelizable, or risky checks.
- Give each subagent minimal context and one explicit deliverable.
- Final synthesis stays in primary agent.

## TDD (Critical backend only)

- Read existing tests first.
- For new features or changes, add or adjust a test before implementation.
- Follow existing testing patterns.
- Ask user only when test strategy is genuinely ambiguous.
