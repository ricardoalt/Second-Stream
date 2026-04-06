# Agent Docs

This directory is the canonical operational guide for repo work.

## Read Order

1. `AGENTS.md`
2. `docs/agents/README.md`
3. the matching task-specific doc in this directory
4. active task plan in `docs/plans/`

## Doc Map

- `docs/agents/development-commands.md` - local commands, checks, build paths
- `docs/agents/workflows.md` - common feature, endpoint, migration workflows
- `docs/agents/architecture.md` - request flow, data model, key files
- `docs/agents/code-style.md` - coding principles and style defaults
- `docs/agents/debugging.md` - debug commands and common failures
- `docs/agents/environment-setup.md` - env vars and local setup
- `docs/agents/aws-credentials-setup.md` - backend local AWS credential flow for Docker Compose
- `docs/agents/deployment.md` - deploy notes and constraints
- `docs/agents/performance.md` - performance defaults and watchouts
- `docs/archive/README.md` - archive policy for inactive docs

## Rules

- Keep docs narrow. Link out instead of duplicating.
- One fact, one home. Put canonical guidance in one place.
- If behavior changes, update the matching doc in the same change.
- Plans in `docs/plans/` are task-specific. They do not replace canonical guidance here.
- Move retired, resolved, or otherwise inactive docs to `docs/archive/` instead of leaving them mixed with active guidance.
