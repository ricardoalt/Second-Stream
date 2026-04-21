# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Go tests, Bubbletea TUI testing | go-testing | /Users/ricardoaltamirano/.config/opencode/skills/go-testing/SKILL.md |
| Creating new AI skills | skill-creator | /Users/ricardoaltamirano/.config/opencode/skills/skill-creator/SKILL.md |
| creating a pull request, opening a PR, preparing changes for review | branch-pr | /Users/ricardoaltamirano/.config/opencode/skills/branch-pr/SKILL.md |
| creating a GitHub issue, reporting a bug, requesting a feature | issue-creation | /Users/ricardoaltamirano/.config/opencode/skills/issue-creation/SKILL.md |
| “judgment day”, “dual review”, adversarial review keywords | judgment-day | /Users/ricardoaltamirano/.config/opencode/skills/judgment-day/SKILL.md |
| AI SDK, generateText, streamText, useChat, tool calling | ai-sdk | /Users/ricardoaltamirano/.agents/skills/ai-sdk/SKILL.md |
| mentions Pydantic AI, `pydantic_ai`, tools/capabilities/testing | building-pydantic-ai-agents | /Users/ricardoaltamirano/.agents/skills/building-pydantic-ai-agents/SKILL.md |
| build AI agents with Pydantic AI (Python) and Claude SDK (Node.js) | agentic-development | /Users/ricardoaltamirano/.agents/skills/agentic-development/SKILL.md |
| designing/building autonomous AI agents and orchestration | ai-agents-architect | /Users/ricardoaltamirano/.agents/skills/ai-agents-architect/SKILL.md |
| AI chat interfaces with ai-elements components | ai-elements | /Users/ricardoaltamirano/.agents/skills/ai-elements/SKILL.md |
| prompt engineering for production LLMs | ai-prompt-engineering | /Users/ricardoaltamirano/.agents/skills/ai-prompt-engineering/SKILL.md |
| code quality assessment before merge | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| refactor for clarity without behavior changes | code-simplification | /Users/ricardoaltamirano/.agents/skills/code-simplification/SKILL.md |
| improve architecture/testability/deepen modules | improve-codebase-architecture | /Users/ricardoaltamirano/.agents/skills/improve-codebase-architecture/SKILL.md |
| build/modify production-quality user-facing interfaces | frontend-ui-engineering | /Users/ricardoaltamirano/.agents/skills/frontend-ui-engineering/SKILL.md |
| React/Next.js performance refactors | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| work with shadcn/ui components/registries/presets | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| styling with Tailwind v4 patterns | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| setup Tailwind CSS v4 in Expo/NativeWind | tailwind-setup | /Users/ricardoaltamirano/.claude/skills/tailwind-setup/SKILL.md |
| optimize Postgres queries/schema/config | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| implement logs in medium/large production systems | Logging Best Practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| prepare production launch/rollout/rollback | shipping-and-launch | /Users/ricardoaltamirano/.agents/skills/shipping-and-launch/SKILL.md |
| review UI against Web Interface Guidelines | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |
| create PRD through interview + exploration | write-a-prd | /Users/ricardoaltamirano/.agents/skills/write-a-prd/SKILL.md |
| stress-test plan against project domain model | domain-model | /Users/ricardoaltamirano/.agents/skills/domain-model/SKILL.md |
| “grill me” design interrogation | grill-me | /Users/ricardoaltamirano/.agents/skills/grill-me/SKILL.md |
| structured ideation and idea refinement | idea-refine | /Users/ricardoaltamirano/.agents/skills/idea-refine/SKILL.md |
| interface design for dashboards/apps/tools | interface-design | /Users/ricardoaltamirano/.agents/skills/interface-design/SKILL.md |
| redesign existing projects to premium quality | redesign-existing-projects | /Users/ricardoaltamirano/.agents/skills/redesign-existing-projects/SKILL.md |
| editorial minimalist UI style system | minimalist-ui | /Users/ricardoaltamirano/.agents/skills/minimalist-ui/SKILL.md |
| premium anti-generic frontend design standards | design-taste-frontend | /Users/ricardoaltamirano/.agents/skills/design-taste-frontend/SKILL.md |
| semantic design system creation for Stitch | stitch-design-taste | /Users/ricardoaltamirano/.agents/skills/stitch-design-taste/SKILL.md |
| optimize agent action spaces/tools/observations | agent-harness-construction | /Users/ricardoaltamirano/.agents/skills/agent-harness-construction/SKILL.md |
| detailed plan interview workflow | interview-me-plan | /Users/ricardoaltamirano/.claude/skills/interview-me-plan.md/SKILL.md |

## Compact Rules

### ai-sdk
- Use AI SDK primitives (`generateText`, `streamText`, tools, embeddings) instead of ad-hoc wrappers.
- Prefer structured output contracts for deterministic downstream logic.
- Keep provider wiring isolated from business modules.
- Stream responses for chat/long outputs; avoid blocking UX.
- Validate tool I/O schemas and fail fast on invalid calls.

### building-pydantic-ai-agents
- Define explicit agent model, tools, and result schema up front.
- Keep tools small, side-effect aware, and separately testable.
- Use typed dependencies/context, not global mutable state.
- Add tests for tool behavior + agent orchestration paths.
- Prefer deterministic validation over prompt-only guarantees.

### frontend-ui-engineering
- Build production-ready UI: clear structure, robust states, accessible semantics.
- Favor composable components over monolithic JSX blocks.
- Model loading/empty/error/success states explicitly.
- Keep visual and interaction consistency across similar surfaces.
- Protect runtime paths with type-safe props and guards.

### vercel-react-best-practices
- Minimize client boundaries; keep logic server-side where feasible.
- Avoid unnecessary effects and re-renders.
- Optimize data fetching and caching strategy by route needs.
- Watch bundle size and avoid heavy client-only imports in hot paths.
- Preserve streaming/Suspense-friendly component boundaries.

### shadcn
- Reuse existing shadcn primitives before introducing custom widgets.
- Keep variants centralized and predictable.
- Maintain design token consistency across components.
- Prefer composition of primitives over deep prop branching.
- Validate accessibility states when customizing primitives.

### tailwind-4
- Use Tailwind v4 token/convention patterns consistently.
- Prefer utility composition helpers (`cn`) for readable class logic.
- Avoid invalid dynamic class patterns; keep class names statically discoverable.
- Keep spacing/typography scale consistent with design tokens.
- Do not introduce style patterns that bypass project conventions.

### supabase-postgres-best-practices
- Design queries for index usage and predictable plans.
- Avoid N+1 patterns; batch or join intentionally.
- Prefer explicit constraints and clear schema semantics.
- Verify transactional boundaries for multi-step mutations.
- Optimize with measured evidence, not assumptions.

### Logging Best Practices
- Log for observability goals, not noise.
- Use structured logs with stable field names.
- Never log secrets/PII.
- Align log levels with operational impact.
- Include correlation/context IDs for traceability.

### code-review
- Review correctness, reliability, security, performance, and maintainability.
- Flag missing tests for risky behavior changes.
- Require clear failure handling and edge-case coverage.
- Prioritize high-impact issues with actionable fixes.
- Keep feedback concrete and verifiable.

### code-simplification
- Reduce cognitive load without changing behavior.
- Remove indirection not providing real abstraction value.
- Consolidate duplicated logic into clear shared paths.
- Prefer explicit naming over comments-as-explanation.
- Keep interfaces small and intention-revealing.

### go-testing
- Follow repository test conventions before adding new patterns.
- Use table-driven tests for behavior matrices.
- Keep tests deterministic and isolated from shared mutable state.
- Use proper Bubbletea/teatest patterns for TUI flows.
- Assert behavior, not incidental implementation details.

### issue-creation
- Create issue-first artifacts with clear scope and acceptance criteria.
- Capture user impact, constraints, and expected outcomes.
- Keep issue body actionable for implementation planning.
- Align labels/metadata with project workflow.
- Avoid ambiguous TODO-only issue descriptions.

### branch-pr
- Validate branch diff/state before creating PR.
- Summarize complete change set (not just latest commit).
- Ensure branch is pushed/tracking remote before PR creation.
- Use consistent PR format with concise summary bullets.
- Return PR URL and highlight review-critical risks.

### skill-creator
- Define precise trigger conditions for new skills.
- Keep rules explicit, testable, and implementation-oriented.
- Include anti-patterns and hard constraints where relevant.
- Avoid vague guidance that cannot drive execution.
- Ensure skill docs are reusable across sessions.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Index — references files below |
| README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Referenced by AGENTS.md |
| development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Referenced by AGENTS.md |
| workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Referenced by AGENTS.md |
| architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Referenced by AGENTS.md |
| code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Referenced by AGENTS.md |
| debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Referenced by AGENTS.md |
| environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Referenced by AGENTS.md |
| deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Referenced by AGENTS.md |
| performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Referenced by AGENTS.md |
| archive/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/archive/README.md | Referenced by AGENTS.md |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Project-level agent conventions |

Read the convention files listed above for project-specific patterns and rules.
