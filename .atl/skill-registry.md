# Skill Registry

**Delegator use only.** Read once per session to resolve skill paths; inject pre-resolved paths directly into sub-agent prompts.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Create/build agents or ask about autonomous agent design | agent-builder | /Users/ricardoaltamirano/.agents/skills/agent-builder/SKILL.md |
| Build AI agents with Pydantic AI / Claude SDK | agentic-development | /Users/ricardoaltamirano/.agents/skills/agentic-development/SKILL.md |
| Agent architecture, tool use, memory, orchestration | ai-agents-architect | /Users/ricardoaltamirano/.agents/skills/ai-agents-architect/SKILL.md |
| Prompt engineering for production LLMs | ai-prompt-engineering | /Users/ricardoaltamirano/.agents/skills/ai-prompt-engineering/SKILL.md |
| Backend architecture patterns, clean/hexagonal/DDD | architecture-patterns | /Users/ricardoaltamirano/.agents/skills/architecture-patterns/SKILL.md |
| Brainstorm before creative feature work | brainstorming | /Users/ricardoaltamirano/.agents/skills/brainstorming/SKILL.md |
| Create/update PRs for branch workflow | branch-pr | /Users/ricardoaltamirano/.config/opencode/skills/branch-pr/SKILL.md |
| Code review / audits | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| Find/install a skill | find-skills | /Users/ricardoaltamirano/.agents/skills/find-skills/SKILL.md |
| Strong React/Next landing/product UI | frontend-skill | /Users/ricardoaltamirano/.agents/skills/frontend-design/SKILL.md |
| Go tests / Bubbletea testing | go-testing | /Users/ricardoaltamirano/.claude/skills/go-testing/SKILL.md |
| Stress-test a plan | grill-me | /Users/ricardoaltamirano/.agents/skills/grill-me/SKILL.md |
| Improve testability / shallow modules | improve-codebase-architecture | /Users/ricardoaltamirano/.agents/skills/improve-codebase-architecture/SKILL.md |
| Interface design for dashboards/apps | interface-design | /Users/ricardoaltamirano/.agents/skills/interface-design/SKILL.md |
| Interview user to define a plan | interview-me-plan | /Users/ricardoaltamirano/.claude/skills/interview-me-plan.md/SKILL.md |
| GitHub issue creation workflow | issue-creation | /Users/ricardoaltamirano/.config/opencode/skills/issue-creation/SKILL.md |
| Parallel adversarial review | judgment-day | /Users/ricardoaltamirano/.config/opencode/skills/judgment-day/SKILL.md |
| Logging design for production systems | Logging Best Practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| Implement change tasks | sdd-apply | /Users/ricardoaltamirano/.config/opencode/skills/sdd-apply/SKILL.md |
| Archive completed SDD change | sdd-archive | /Users/ricardoaltamirano/.config/opencode/skills/sdd-archive/SKILL.md |
| Write technical design | sdd-design | /Users/ricardoaltamirano/.config/opencode/skills/sdd-design/SKILL.md |
| Explore/clarify before a change | sdd-explore | /Users/ricardoaltamirano/.config/opencode/skills/sdd-explore/SKILL.md |
| Initialize SDD context | sdd-init | /Users/ricardoaltamirano/.config/opencode/skills/sdd-init/SKILL.md |
| Onboard through SDD cycle | sdd-onboard | /Users/ricardoaltamirano/.claude/skills/sdd-onboard/SKILL.md |
| Create proposal | sdd-propose | /Users/ricardoaltamirano/.claude/skills/sdd-propose/SKILL.md |
| Write specs | sdd-spec | /Users/ricardoaltamirano/.claude/skills/sdd-spec/SKILL.md |
| Break down implementation tasks | sdd-tasks | /Users/ricardoaltamirano/.claude/skills/sdd-tasks/SKILL.md |
| Verify implementation | sdd-verify | /Users/ricardoaltamirano/.claude/skills/sdd-verify/SKILL.md |
| Search/add shadcn components | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| Audit for unnecessary complexity | simplify | /Users/ricardoaltamirano/.agents/skills/simplify/SKILL.md |
| Create/update agent skills | skill-creator | /Users/ricardoaltamirano/.config/opencode/skills/skill-creator/SKILL.md |
| Update skill registry | skill-registry | /Users/ricardoaltamirano/.claude/skills/skill-registry/SKILL.md |
| Postgres performance/schema best practices | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| Tailwind CSS 4 patterns | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| Tailwind setup for Expo | tailwind-setup | /Users/ricardoaltamirano/.claude/skills/tailwind-setup/SKILL.md |
| UI/UX design intelligence | ui-ux-pro-max | /Users/ricardoaltamirano/.agents/skills/ui-ux-pro-max/SKILL.md |
| React/Next.js best practices | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| Review UI against web guidelines | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |
| Write a PRD | write-a-prd | /Users/ricardoaltamirano/.agents/skills/write-a-prd/SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Root policy + repo doc index |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Root agent guidance |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Canonical ops guide index |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Commands and checks |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Common feature workflows |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Request flow + data model |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Style defaults |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Troubleshooting |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Env setup |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Deploy notes |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Performance guidance |
| docs/archive/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/archive/README.md | Archive policy |

## Compact Rules

### sdd-init
- Detect stack, conventions, and test capabilities from the real repo.
- Persist testing capabilities separately; downstream phases depend on it.
- In engram mode, do not create openspec/.

### sdd-apply / sdd-verify
- Follow existing code patterns and repo docs first.
- Prefer tests-first for backend changes.
- Verify against the detected testing stack before reporting done.

### go-testing
- Read existing tests first.
- Use teatest/Bubbletea patterns when applicable.

### vercel-react-best-practices
- Avoid unnecessary client state/effects.
- Prefer server components and streaming where appropriate.

### tailwind-4
- Use cn() and theme tokens; avoid raw var() in className.

### shadcn
- Prefer registry components and project conventions over custom one-offs.

### simplify
- Remove needless indirection, deep nesting, and duplicated paths.

### architecture-patterns
- Keep dependency direction explicit; protect domain boundaries.

Read the repo convention files above for project-specific patterns and rules.
