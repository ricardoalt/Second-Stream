# Skill Registry

## Project Conventions
- Repo docs are the source of truth; start with `AGENTS.md`.
- Canonical operational docs live in `docs/agents/`.
- Stack: FastAPI backend, Next.js frontend, Terraform infra.
- Backend commands live in `backend/Makefile`; frontend commands live in `frontend/package.json`.
- Frontend lint/format/check is governed by Biome + Ultracite (`frontend/biome.json`).

## Referenced Docs
- `AGENTS.md`
- `CLAUDE.md`
- `docs/agents/README.md`
- `docs/agents/development-commands.md`
- `docs/agents/architecture.md`
- `docs/agents/code-style.md`

## Relevant Skills
| Trigger | Skill | Path |
|---------|-------|------|
| shadcn/ui work | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| Tailwind v4 styling | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| React/Next.js performance | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| backend architecture refactors | architecture-patterns | /Users/ricardoaltamirano/.agents/skills/architecture-patterns/SKILL.md |
| Postgres/schema/query tuning | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| simplification / complexity audits | simplify | /Users/ricardoaltamirano/.agents/skills/simplify/SKILL.md |
| UI/UX review and design work | ui-ux-pro-max | /Users/ricardoaltamirano/.agents/skills/ui-ux-pro-max/SKILL.md |

## Compact Rules

### shadcn
- Prefer registry-backed shadcn components over hand-rolled duplicates.
- Keep composition in the app layer; avoid bloating the registry with app-specific logic.
- Follow the existing component structure and project theme tokens.

### tailwind-4
- Use `cn()` for class composition; avoid raw `var()` inside className.
- Prefer theme tokens and utility composition over ad hoc CSS.
- Keep responsive/state variants explicit and readable.

### vercel-react-best-practices
- Avoid premature memoization; only optimize proven hot paths.
- Prefer server components and simple data flow where possible.
- Keep client components minimal and isolate interactivity.

### architecture-patterns
- Protect layer boundaries; domain/application/infrastructure should not leak casually.
- Prefer explicit interfaces and dependency inversion over direct framework coupling.
- Refactor toward smaller, named units when flows get complex.

### supabase-postgres-best-practices
- Index for real query patterns, not guessed ones.
- Keep SQL explicit and inspect execution cost before optimizing.
- Prefer stable schema design and conservative denormalization.

### simplify
- Remove indirection that does not buy clarity or reuse.
- Prefer direct code paths over layered abstractions when the domain is small.
- Flatten nesting and rename ambiguous concepts before adding helpers.

### ui-ux-pro-max
- Design for hierarchy first; avoid generic card grids and visual clutter.
- Keep motion tasteful and purposeful, not decorative.
- Respect accessibility, spacing, and typographic rhythm.

## Notes
- No project-local skill registry existed before this init.
- Testing is available in both stacks: backend pytest via Docker, frontend Biome checks plus build validation.
