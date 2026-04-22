# Skill Registry

**Delegator use only.** Sub-agents receive resolved skill rules; they do not read SKILL.md files directly.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| review code before merge | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| simplify code without behavior change | code-simplification | /Users/ricardoaltamirano/.agents/skills/code-simplification/SKILL.md |
| build or modify user-facing React UIs | frontend-ui-engineering | /Users/ricardoaltamirano/.agents/skills/frontend-ui-engineering/SKILL.md |
| React/Next.js performance patterns | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| Tailwind CSS 4 patterns | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| shadcn/ui components | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| premium frontend design systems | design-taste-frontend | /Users/ricardoaltamirano/.agents/skills/design-taste-frontend/SKILL.md |
| redesign existing product UI | redesign-existing-projects | /Users/ricardoaltamirano/.agents/skills/redesign-existing-projects/SKILL.md |
| clean editorial-style interfaces | minimalist-ui | /Users/ricardoaltamirano/.agents/skills/minimalist-ui/SKILL.md |
| logging in production systems | Logging Best Practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| Postgres query/schema optimization | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| AI SDK questions and implementation | ai-sdk | /Users/ricardoaltamirano/.agents/skills/ai-sdk/SKILL.md |
| AI chat interfaces | ai-elements | /Users/ricardoaltamirano/.agents/skills/ai-elements/SKILL.md |
| build AI agents with Claude SDK or Pydantic AI | agentic-development | /Users/ricardoaltamirano/.agents/skills/agentic-development/SKILL.md |
| build Pydantic AI agents | building-pydantic-ai-agents | /Users/ricardoaltamirano/.claude/skills/building-pydantic-ai-agents/SKILL.md |
| architecture and domain language alignment | domain-model | /Users/ricardoaltamirano/.agents/skills/domain-model/SKILL.md |
| improve architecture and testability | improve-codebase-architecture | /Users/ricardoaltamirano/.agents/skills/improve-codebase-architecture/SKILL.md |
| interface design for dashboards and tools | interface-design | /Users/ricardoaltamirano/.agents/skills/interface-design/SKILL.md |
| create or update AI skills | skill-creator | /Users/ricardoaltamirano/.agents/skills/skill-creator/SKILL.md |

## Compact Rules

### code-review
- Review across correctness, security, performance, maintainability, and tests.
- Prefer evidence from code/docs; do not guess.
- Call out concrete risks and missing coverage.

### code-simplification
- Remove indirection; keep behavior unchanged.
- Prefer smaller functions and clearer names over comments.
- Preserve tests; simplify one responsibility at a time.

### frontend-ui-engineering
- Build production-quality React UIs with strong component boundaries.
- Optimize rendering and keep state close to usage.
- Use accessible, composable primitives; avoid monolith JSX.

### vercel-react-best-practices
- Prefer server components and minimal client boundaries.
- Avoid unnecessary effects/memoization; let the compiler work.
- Keep data fetching and state transitions explicit.

### tailwind-4
- Use `cn()` for class composition.
- Prefer theme tokens and utility classes; avoid raw `var()` in className.
- Keep styles declarative and consistent.

### shadcn
- Compose existing primitives before introducing custom UI.
- Keep components registry-friendly and accessible.
- Match local conventions for `cn`, slots, and variants.

### design-taste-frontend
- Reject generic AI layouts; use intentional hierarchy and spacing.
- Keep motion restrained, hardware-accelerated, and purposeful.
- Calibrate color, contrast, and rhythm with precision.

### redesign-existing-projects
- Upgrade the current UI without breaking behavior.
- Identify generic patterns, then replace with premium, coherent design.
- Preserve product structure; improve polish, spacing, and hierarchy.

### minimalist-ui
- Use warm monochrome, typographic contrast, and flat layouts.
- Avoid gradients and heavy shadows.
- Favor clean editorial composition and restraint.

### Logging Best Practices
- Log structure, not prose; include context and correlation fields.
- Avoid noisy logs and sensitive data.
- Capture root cause signals, not just symptoms.

### supabase-postgres-best-practices
- Prefer sargable queries and indexed access paths.
- Keep JSONB/relational tradeoffs explicit.
- Avoid unnecessary round trips and N+1 patterns.

### ai-sdk
- Use the SDK’s stream/tool/structured-output primitives as intended.
- Keep provider-specific behavior isolated.
- Favor typed schemas and explicit tool contracts.

### ai-elements
- Compose conversation/message/tool display primitives.
- Keep chat UI state and rendering separated.
- Preserve accessibility and streaming feedback states.

### agentic-development
- Build agents with typed tools, structured output, and streaming.
- Keep tool boundaries small and testable.
- Prefer explicit orchestration over hidden prompt magic.

### building-pydantic-ai-agents
- Define agents with typed dependencies and structured outputs.
- Test tool behavior and streaming paths.
- Keep agent prompts and business rules separated.

### domain-model
- Align terms with repo docs and canonical names.
- Challenge ambiguous naming before coding.
- Update docs when concepts or boundaries change.

### improve-codebase-architecture
- Deepen shallow modules and separate orchestration from policy.
- Improve testability by reducing coupling.
- Prefer explicit seams over incidental complexity.

### interface-design
- Design for operational clarity first, aesthetics second.
- Structure information by hierarchy and task flow.
- Keep controls obvious, states visible, and density intentional.

### skill-creator
- Write skills as actionable rules, not essays.
- Keep triggers precise and behavior focused.
- Document only what an agent must apply.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Index — repo-wide policy and doc precedence |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Project guidance for Claude Code |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Index — references canonical agent docs |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Local commands and checks |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Feature/endpoint/migration workflows |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Architecture, request flow, key files |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Style and default code principles |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Debugging playbook |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Environment variables and setup |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Deployment notes and constraints |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Performance defaults and watchouts |
| docs/agents/aws-credentials-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/aws-credentials-setup.md | Local AWS credential flow |
| .gitignore | /Users/ricardoaltamirano/Developer/SecondStream/.gitignore | Excludes .atl and build/test artifacts |

## Notes

- Skip `sdd-*`, `_shared`, and `skill-registry` when resolving skills.
- Project-level conventions are the repo docs above; keep one fact in one home.
