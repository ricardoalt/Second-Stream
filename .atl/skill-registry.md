# Skill Registry

**Orchestrator use only.** Read this registry once per session to resolve skill paths, then pass pre-resolved paths directly to each sub-agent's launch prompt.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| create an agent / design AI system | agent-builder | /Users/ricardoaltamirano/.agents/skills/agent-builder/SKILL.md |
| build AI agents with Pydantic AI / Claude SDK | agentic-development | /Users/ricardoaltamirano/.agents/skills/agentic-development/SKILL.md |
| before creative work / feature design | brainstorming | /Users/ricardoaltamirano/.agents/skills/brainstorming/SKILL.md |
| create/open a PR / review branch | branch-pr | /Users/ricardoaltamirano/.config/opencode/skills/branch-pr/SKILL.md |
| automated code review / audit | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| visually strong UI / landing page / prototype | frontend-skill | /Users/ricardoaltamirano/.agents/skills/frontend-design/SKILL.md |
| Go tests / Bubbletea TUI testing | go-testing | /Users/ricardoaltamirano/.config/opencode/skills/go-testing/SKILL.md |
| stress-test a plan / design | grill-me | /Users/ricardoaltamirano/.agents/skills/grill-me/SKILL.md |
| detailed plan / requirements interview | interview-me-plan | /Users/ricardoaltamirano/.claude/skills/interview-me-plan.md/SKILL.md |
| create issue / bug report / feature request | issue-creation | /Users/ricardoaltamirano/.config/opencode/skills/issue-creation/SKILL.md |
| adversarial dual review | judgment-day | /Users/ricardoaltamirano/.config/opencode/skills/judgment-day/SKILL.md |
| production logging guidance | Logging Best Practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| implement tasks from change | sdd-apply | /Users/ricardoaltamirano/.config/opencode/skills/sdd-apply/SKILL.md |
| archive completed change | sdd-archive | /Users/ricardoaltamirano/.config/opencode/skills/sdd-archive/SKILL.md |
| technical design for a change | sdd-design | /Users/ricardoaltamirano/.config/opencode/skills/sdd-design/SKILL.md |
| explore ideas before implementation | sdd-explore | /Users/ricardoaltamirano/.config/opencode/skills/sdd-explore/SKILL.md |
| initialize SDD context | sdd-init | /Users/ricardoaltamirano/.config/opencode/skills/sdd-init/SKILL.md |
| create change proposal | sdd-propose | /Users/ricardoaltamirano/.config/opencode/skills/sdd-propose/SKILL.md |
| write specs | sdd-spec | /Users/ricardoaltamirano/.config/opencode/skills/sdd-spec/SKILL.md |
| break down tasks | sdd-tasks | /Users/ricardoaltamirano/.config/opencode/skills/sdd-tasks/SKILL.md |
| verify implementation vs specs | sdd-verify | /Users/ricardoaltamirano/.config/opencode/skills/sdd-verify/SKILL.md |
| shadcn/ui components and registry | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| simplify complex code | simplify | /Users/ricardoaltamirano/.agents/skills/simplify/SKILL.md |
| create or document new skills | skill-creator | /Users/ricardoaltamirano/.config/opencode/skills/skill-creator/SKILL.md |
| update skill registry | skill-registry | /Users/ricardoaltamirano/.agents/skills/skill-registry/SKILL.md |
| Postgres design / performance | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| Tailwind CSS 4 patterns | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| Tailwind v4 setup in Expo | tailwind-setup | /Users/ricardoaltamirano/.claude/skills/tailwind-setup/SKILL.md |
| React / Next.js performance best practices | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| UI / accessibility / design review | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Canonical repo entrypoint and policy summary |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Project guidance for Claude Code |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Canonical operational guide index |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Local commands and checks |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Common backend/frontend/migration workflows |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Request flow, data model, key files |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Style and code principles |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Debug commands and common failures |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Env vars and local setup |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Deployment notes and constraints |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Performance defaults and watchouts |
| docs/archive/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/archive/README.md | Archive policy for inactive docs |

Read the convention files above for repo-specific patterns and rules. All referenced paths have been extracted; no extra hops needed.
