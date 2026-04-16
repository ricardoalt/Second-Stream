# Skill Registry

**Delegator use only.** Sub-agents should receive resolved compact rules, not read skill files directly.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Trigger: When creating new AI skills | skill-creator | /Users/ricardoaltamirano/.config/opencode/skills/skill-creator/SKILL.md |
| Trigger: When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | /Users/ricardoaltamirano/.config/opencode/skills/issue-creation/SKILL.md |
| Trigger: When working with Go tests, Bubbletea TUI testing | go-testing | /Users/ricardoaltamirano/.config/opencode/skills/go-testing/SKILL.md |
| Trigger: When creating a pull request, opening a PR, or preparing changes for review | branch-pr | /Users/ricardoaltamirano/.config/opencode/skills/branch-pr/SKILL.md |
| Trigger: When asking to update the registry | skill-registry | /Users/ricardoaltamirano/.agents/skills/skill-registry/SKILL.md |
| Trigger: When using React/Next.js performance optimization | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| Trigger: When styling with Tailwind | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| Trigger: When setting up Tailwind CSS v4 in Expo | tailwind-setup | /Users/ricardoaltamirano/.claude/skills/tailwind-setup/SKILL.md |
| Trigger: When asked to review UI, accessibility, UX, or best practices | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |
| Trigger: When working with shadcn/ui, component registries, presets, or a components.json project | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| Trigger: When building or modifying user-facing interfaces | frontend-ui-engineering | /Users/ricardoaltamirano/.agents/skills/frontend-ui-engineering/SKILL.md |
| Trigger: When designing dashboards, admin panels, apps, tools, or interactive products | interface-design | /Users/ricardoaltamirano/.agents/skills/interface-design/SKILL.md |
| Trigger: When upgrading existing websites/apps to premium quality | redesign-existing-projects | /Users/ricardoaltamirano/.agents/skills/redesign-existing-projects/SKILL.md |
| Trigger: When applying minimalist editorial UI direction | minimalist-ui | /Users/ricardoaltamirano/.agents/skills/minimalist-ui/SKILL.md |
| Trigger: When designing semantic design systems for Google Stitch | stitch-design-taste | /Users/ricardoaltamirano/.agents/skills/stitch-design-taste/SKILL.md |
| Trigger: When shaping frontend design taste or composition | design-taste-frontend | /Users/ricardoaltamirano/.agents/skills/design-taste-frontend/SKILL.md |
| Trigger: When improving codebase architecture for testability | improve-codebase-architecture | /Users/ricardoaltamirano/.agents/skills/improve-codebase-architecture/SKILL.md |
| Trigger: When simplifying code for clarity | code-simplification | /Users/ricardoaltamirano/.agents/skills/code-simplification/SKILL.md |
| Trigger: When conducting multi-axis code review | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| Trigger: When planning production launches | shipping-and-launch | /Users/ricardoaltamirano/.agents/skills/shipping-and-launch/SKILL.md |
| Trigger: When creating or debugging AI agents with Pydantic AI or Claude SDK | agentic-development | /Users/ricardoaltamirano/.agents/skills/agentic-development/SKILL.md |
| Trigger: When designing AI agent tool/action spaces and observations | agent-harness-construction | /Users/ricardoaltamirano/.agents/skills/agent-harness-construction/SKILL.md |
| Trigger: When engineering prompts for production LLMs | ai-prompt-engineering | /Users/ricardoaltamirano/.agents/skills/ai-prompt-engineering/SKILL.md |
| Trigger: When reviewing UI code for interface guidelines | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |
| Trigger: When writing or reviewing logs/observability strategies | logging-best-practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| Trigger: When writing, reviewing, or optimizing Postgres queries/schema/config | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| Trigger: When stress-testing a plan or design | grill-me | /Users/ricardoaltamirano/.agents/skills/grill-me/SKILL.md |
| Trigger: When refining ideas iteratively | idea-refine | /Users/ricardoaltamirano/.agents/skills/idea-refine/SKILL.md |
| Trigger: When writing a PRD or product plan | write-a-prd | /Users/ricardoaltamirano/.agents/skills/write-a-prd/SKILL.md |
| Trigger: When interviewing to write a detailed plan | interview-me-plan | /Users/ricardoaltamirano/.claude/skills/interview-me-plan.md/SKILL.md |

## Compact Rules

### skill-creator
- Define purpose, trigger, and allowed tools clearly.
- Keep instructions executable, specific, and minimal.
- Include examples only when they change behavior.

### issue-creation
- Start from the bug/feature report and capture reproduction or desired outcome.
- Prefer a crisp issue body with context, scope, and acceptance criteria.
- Do not mix implementation details into the issue unless required.

### go-testing
- Read existing tests first; match teatest/Bubble Tea patterns.
- Prefer table-driven tests and deterministic input/output.
- Test behavior, not internal state; keep fixtures minimal.

### branch-pr
- Inspect status, diff, and branch tracking before PR creation.
- Summarize all included commits, not just the latest one.
- Use `gh pr create`; include rollback/risk notes when needed.

### vercel-react-best-practices
- Eliminate waterfalls first; parallelize independent async work.
- Reduce bundle size with direct imports and dynamic loading for heavy code.
- Minimize client serialization and unnecessary re-renders.

### tailwind-4
- Use semantic Tailwind classes; avoid `var()` and hex in `className`.
- Use `cn()` for conditional/merged classes, plain `className` for static ones.
- Put dynamic values in `style` or CSS variables, not class strings.

### tailwind-setup
- Follow Expo universal styling setup exactly; do not mix incompatible systems casually.
- Keep config aligned between NativeWind/react-native-css and project scripts.
- Verify generated classes and token flow after setup.

### web-design-guidelines
- Fetch the latest guideline source before reviewing UI.
- Output findings in terse `file:line` format only.
- Review against the full rule set, not just obvious accessibility items.

### shadcn
- Prefer existing shadcn components and variants before custom markup.
- Use semantic tokens and `cn()`; do not fight component styling with raw overrides.
- Respect composition rules: grouped items, required titles, fallback components.

### frontend-ui-engineering
- Split container/data logic from presentational components.
- Choose the simplest state scope that fits the problem.
- Keep components focused, composable, accessible, and visually polished.

### interface-design
- Start with intent, domain vocabulary, and a specific signature element.
- Avoid defaults; every layout, color, and hierarchy choice must be deliberate.
- Design systemic tone: typography, spacing, motion, and tokens must all align.

### redesign-existing-projects
- Audit current UI for generic patterns before changing anything.
- Upgrade visuals without breaking product behavior or structure.
- Preserve functionality while replacing AI-generic defaults with a clearer system.

### minimalist-ui
- Use warm monochrome, flat surfaces, typographic contrast, and restrained motion.
- Avoid gradients, heavy shadows, and decorative clutter.
- Favor editorial spacing and calm hierarchy over visual noise.

### stitch-design-taste
- Build agent-friendly design systems with strong typography and calibrated color.
- Avoid generic layouts; prefer asymmetric composition and micro-motion.
- Optimize for hardware-accelerated polish and reusable design tokens.

### design-taste-frontend
- Treat design as architecture: spacing, tokens, and hierarchy are decisions.
- Keep the interface distinct to the product domain, not a generic shell.
- Translate intent into systemic constraints across the whole UI.

### improve-codebase-architecture
- Deepen shallow modules and clarify boundaries.
- Optimize for testability and AI navigability, not cleverness.
- Reduce coupling; extract stable concepts into well-named modules.

### code-simplification
- Preserve behavior exactly; simplify expression, not semantics.
- Prefer clarity over cleverness and scope changes narrowly.
- Simplify only after understanding why the code exists.

### code-review
- Review correctness, readability, architecture, security, and performance.
- Use the project’s own conventions as the acceptance baseline.
- Catch edge cases, over-engineering, and hidden regressions.

### shipping-and-launch
- Prepare rollback, staged rollout, monitoring, and failure handling.
- Verify pre-launch readiness before production exposure.
- Treat launch as an operational plan, not just a deploy.

### agentic-development
- Keep agent tools, state, and prompts explicit and minimal.
- Prefer structured outputs and deterministic tool boundaries.
- Design for observability, retries, and safe failure modes.

### agent-harness-construction
- Make action spaces small, clear, and strongly typed where possible.
- Optimize observations for decision-making, not raw verbosity.
- Prevent tool ambiguity and duplicated responsibilities.

### ai-prompt-engineering
- Use structured outputs and explicit schemas.
- Separate instructions, context, and examples cleanly.
- Treat prompt ambiguity as a failure mode to remove.

### logging-best-practices
- Use structured logs with event names and correlation IDs.
- Log state transitions, failures, and external calls; avoid secrets and hot-path noise.
- Make logs queryable and operationally useful.

### supabase-postgres-best-practices
- Prefer query/index/schema fixes over application workarounds.
- Use proper indexes, parameterization, and row-level security discipline.
- Watch connection management, locking, and query plans.

### grill-me
- Force decisions by probing assumptions and unresolved branches.
- Do not accept vague plans; require concrete tradeoffs and edge cases.
- Keep pressure high until the design is genuinely defensible.

### idea-refine
- Alternate divergence and convergence deliberately.
- Use structured comparison to narrow options.
- Keep each refinement round focused on one dimension.

### write-a-prd
- Start from user problem, scope, success metrics, and constraints.
- Convert interviews and exploration into clear product requirements.
- Keep the PRD actionable for downstream implementation.

### interview-me-plan
- Ask targeted questions until the plan has no ambiguous branches.
- Resolve scope, dependencies, sequencing, and open risks before drafting.
- Stop and wait when user answers are needed.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Index — references files below |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Referenced by AGENTS.md |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Referenced by AGENTS.md / CLAUDE.md |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Referenced by AGENTS.md / CLAUDE.md |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Referenced by AGENTS.md / CLAUDE.md |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Referenced by AGENTS.md / CLAUDE.md |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Referenced by AGENTS.md / CLAUDE.md |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Referenced by AGENTS.md / CLAUDE.md |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Referenced by AGENTS.md |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Referenced by AGENTS.md |
| docs/archive/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/archive/README.md | Referenced by docs/agents/README.md / AGENTS.md |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Project-level guidance index |
