# Skill Registry

**Delegator use only.** Sub-agents receive resolved compact rules; they do not read this file or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| UI engineering for React/Next apps | frontend-ui-engineering | /Users/ricardoaltamirano/.agents/skills/frontend-ui-engineering/SKILL.md |
| React/Next performance and bundle hygiene | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| Tailwind v4 patterns | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| shadcn/ui components | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| UI redesign and polish | redesign-existing-projects | /Users/ricardoaltamirano/.agents/skills/redesign-existing-projects/SKILL.md |
| Minimal editorial interfaces | minimalist-ui | /Users/ricardoaltamirano/.agents/skills/minimalist-ui/SKILL.md |
| Code review before merge | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| Simplify complex code | code-simplification | /Users/ricardoaltamirano/.agents/skills/code-simplification/SKILL.md |
| Postgres schema/query best practices | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| Production logging patterns | logging-best-practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| Write PRDs | write-a-prd | /Users/ricardoaltamirano/.agents/skills/write-a-prd/SKILL.md |
| Create GitHub issues | issue-creation | /Users/ricardoaltamirano/.config/opencode/skills/issue-creation/SKILL.md |
| Branch/PR workflow | branch-pr | /Users/ricardoaltamirano/.config/opencode/skills/branch-pr/SKILL.md |
| Go tests and TUI testing | go-testing | /Users/ricardoaltamirano/.config/opencode/skills/go-testing/SKILL.md |

## Compact Rules

### frontend-ui-engineering
- Build production-grade UI; avoid generic LLM layouts.
- Prefer small, composable components and clear component boundaries.
- Keep UX concrete: states, loading, empty, error, and interaction details.

### vercel-react-best-practices
- Prefer server components and minimal client boundaries.
- Avoid unnecessary effects; keep renders predictable.
- Optimize data fetching, memoization, and bundle size intentionally.

### tailwind-4
- Use `cn()` for class composition.
- Prefer theme tokens; do not inline `var()` in `className`.
- Keep utilities declarative and avoid custom CSS unless needed.

### shadcn
- Reuse registry components instead of inventing duplicates.
- Follow the project’s generated component patterns and variants.
- Keep accessibility and Radix semantics intact.

### redesign-existing-projects
- Upgrade quality without breaking behavior.
- Remove generic AI styling; prefer strong hierarchy and intentional spacing.
- Keep changes consistent with existing architecture.

### minimalist-ui
- Use warm monochrome, typographic contrast, flat surfaces.
- Avoid gradients, heavy shadows, and decorative clutter.
- Prefer restrained motion and clear hierarchy.

### code-review
- Review across correctness, architecture, maintainability, and risk.
- Call out missing tests, regressions, and unclear ownership.
- Be explicit about severity and evidence.

### code-simplification
- Reduce branching, nesting, and accidental complexity.
- Preserve behavior while improving readability and testability.
- Prefer named helpers over clever inline logic.

### supabase-postgres-best-practices
- Index for query patterns, not assumptions.
- Prefer explicit constraints and predictable transaction boundaries.
- Watch for N+1, wide scans, and unsafe JSONB usage.

### logging-best-practices
- Log actionable events, not noise.
- Include context, correlation, and stable fields.
- Avoid leaking secrets or large payloads.

### write-a-prd
- Start from user pain, goals, and non-goals.
- Make scope and success criteria explicit.
- Separate discovery, proposal, and implementation concerns.

### issue-creation
- File issues with clear problem, impact, and acceptance criteria.
- Keep titles short and action-oriented.
- Include reproduction or context when available.

### branch-pr
- Use the issue-first workflow for PRs.
- Summarize scope, validation, and rollout risk.
- Keep PR body structured and concise.

### go-testing
- Prefer table-driven tests and small fixtures.
- Use built-in test helpers where possible.
- Keep TUI tests deterministic and time-bounded.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Top-level repo policy and stack summary |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Alternate agent guidance; mirrors repo workflow |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Canonical guide index |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Request flow, data model, key files |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Feature, API, migration workflows |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Local commands and checks |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Style and quality defaults |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Troubleshooting patterns |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Local env and setup |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Deployment constraints |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Performance watchouts |
