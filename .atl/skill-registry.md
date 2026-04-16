# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| sdd init / initialize SDD | sdd-init | /Users/ricardoaltamirano/.config/opencode/skills/sdd-init/SKILL.md |
| sdd explore / investigate change | sdd-explore | /Users/ricardoaltamirano/.config/opencode/skills/sdd-explore/SKILL.md |
| sdd propose / change proposal | sdd-propose | /Users/ricardoaltamirano/.config/opencode/skills/sdd-propose/SKILL.md |
| sdd spec / delta spec | sdd-spec | /Users/ricardoaltamirano/.config/opencode/skills/sdd-spec/SKILL.md |
| sdd tasks / task breakdown | sdd-tasks | /Users/ricardoaltamirano/.config/opencode/skills/sdd-tasks/SKILL.md |
| sdd apply / implement tasks | sdd-apply | /Users/ricardoaltamirano/.config/opencode/skills/sdd-apply/SKILL.md |
| sdd verify / validate change | sdd-verify | /Users/ricardoaltamirano/.config/opencode/skills/sdd-verify/SKILL.md |
| sdd archive / sync archive | sdd-archive | /Users/ricardoaltamirano/.config/opencode/skills/sdd-archive/SKILL.md |
| update skills / registry | skill-registry | /Users/ricardoaltamirano/.config/opencode/skills/skill-registry/SKILL.md |
| create PR / branch prep | branch-pr | /Users/ricardoaltamirano/.config/opencode/skills/branch-pr/SKILL.md |
| create issue / bug report | issue-creation | /Users/ricardoaltamirano/.config/opencode/skills/issue-creation/SKILL.md |
| Go tests / Bubbletea | go-testing | /Users/ricardoaltamirano/.config/opencode/skills/go-testing/SKILL.md |
| shadcn/ui | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| Tailwind CSS v4 | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| React/Next.js perf | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| frontend UI engineering | frontend-ui-engineering | /Users/ricardoaltamirano/.agents/skills/frontend-ui-engineering/SKILL.md |
| UI/UX review | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |
| simplify code | code-simplification | /Users/ricardoaltamirano/.agents/skills/code-simplification/SKILL.md |
| code review | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| architecture improvement | improve-codebase-architecture | /Users/ricardoaltamirano/.agents/skills/improve-codebase-architecture/SKILL.md |
| logging best practices | Logging Best Practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| Supabase Postgres | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |

## Compact Rules

### sdd-init
- Detect stack, conventions, testing, and strict_tdd from existing repo files; do not guess.
- Always persist testing capabilities separately from project context.
- For engram mode, save project context and testing capabilities with stable topic keys.
- Return only an initialization summary; do not create proposal/spec/design/tasks.

### skill-registry
- Read project convention index files and include referenced docs in the registry.
- Keep the registry focused on delegator use; sub-agents should receive resolved rules, not the registry.
- Write `.atl/skill-registry.md` and cache the registry in Engram when available.

### branch-pr
- Inspect status, diff, tracking branch, and history before PR creation.
- Summarize all commits in the branch, not just the latest one.

### issue-creation
- Use repo docs and verified facts; do not invent scope or acceptance criteria.
- Create issues only when the user asks or a bug/feature needs tracking.

### go-testing
- Follow existing Go test patterns before writing new tests.
- Prefer `go test`/teatest patterns already used in the repo.

### shadcn
- Prefer registry/context-aware component composition; do not handwave API behavior.
- Preserve project conventions when adding or fixing shadcn components.

### tailwind-4
- Use `cn()` and theme variables; avoid `var()` in `className`.
- Prefer Tailwind v4 idioms and project tokens over ad hoc CSS.

### vercel-react-best-practices
- Optimize for server components, streaming, and minimal client boundaries.
- Avoid unnecessary effects and client-only code when a server pattern works.

### frontend-ui-engineering
- Build production-quality UI with clear hierarchy, purposeful spacing, and reusable components.
- Keep components small and composable; avoid giant JSX blocks.

### web-design-guidelines
- Check accessibility, semantic structure, keyboard behavior, and visual hierarchy.
- Flag generic or low-contrast UI patterns.

### code-review
- Review across correctness, architecture, tests, perf, security, and maintainability.
- Prefer concrete findings with severity and evidence.

### code-simplification
- Remove incidental complexity without changing behavior.
- Prefer smaller functions, clearer names, and fewer special cases.

### improve-codebase-architecture
- Deepen shallow modules and reduce coupling to improve testability.
- Separate policy from mechanism; keep modules easy to navigate.

### Logging Best Practices
- Log events with stable fields and clear severity.
- Avoid noisy logs; do not log secrets or high-cardinality values unnecessarily.

### supabase-postgres-best-practices
- Favor index-aware queries, explicit constraints, and predictable SQL shapes.
- Avoid anti-patterns that cause scans, locks, or chatty round-trips.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Root entrypoint and policy summary |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Claude-specific project guidance |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Canonical agent docs index |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Local commands and checks |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Common feature and migration workflows |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Architecture and key files |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Code style rules |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Debugging guidance |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Environment setup and vars |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Deployment constraints |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Performance watchouts |
