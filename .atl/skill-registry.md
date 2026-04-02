# Skill Registry

**Orchestrator use only.** Read this once per session, then pass pre-resolved skill paths directly to sub-agents.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Build AI agents / autonomous workflows | agent-builder | /Users/ricardoaltamirano/.agents/skills/agent-builder/SKILL.md |
| Build agents with Pydantic AI or Claude SDK | agentic-development | /Users/ricardoaltamirano/.agents/skills/agentic-development/SKILL.md |
| Before creative work / feature design | brainstorming | /Users/ricardoaltamirano/.agents/skills/brainstorming/SKILL.md |
| Review code changes / PRs / audits | code-review | /Users/ricardoaltamirano/.agents/skills/code-review/SKILL.md |
| Visually strong UI / landing pages / prototypes | frontend-skill | /Users/ricardoaltamirano/.agents/skills/frontend-design/SKILL.md |
| Stress-test a plan or design | grill-me | /Users/ricardoaltamirano/.agents/skills/grill-me/SKILL.md |
| Logging / observability / debugging strategy | Logging Best Practices | /Users/ricardoaltamirano/.agents/skills/logging-best-practices/SKILL.md |
| Working with shadcn/ui | shadcn | /Users/ricardoaltamirano/.agents/skills/shadcn/SKILL.md |
| Reduce unnecessary complexity | simplify | /Users/ricardoaltamirano/.agents/skills/simplify/SKILL.md |
| Postgres queries / schema / config | supabase-postgres-best-practices | /Users/ricardoaltamirano/.agents/skills/supabase-postgres-best-practices/SKILL.md |
| React / Next.js performance work | vercel-react-best-practices | /Users/ricardoaltamirano/.agents/skills/vercel-react-best-practices/SKILL.md |
| UI / accessibility / UX review | web-design-guidelines | /Users/ricardoaltamirano/.agents/skills/web-design-guidelines/SKILL.md |
| Creating PRs / issue-first workflow | branch-pr | /Users/ricardoaltamirano/.claude/skills/branch-pr/SKILL.md |
| Go tests / Bubbletea TUI tests | go-testing | /Users/ricardoaltamirano/.claude/skills/go-testing/SKILL.md |
| Create GitHub issues / feature requests | issue-creation | /Users/ricardoaltamirano/.claude/skills/issue-creation/SKILL.md |
| Write detailed plans by interview | interview-me-plan | /Users/ricardoaltamirano/.claude/skills/interview-me-plan.md/SKILL.md |
| Create new skills / agent instructions | skill-creator | /Users/ricardoaltamirano/.claude/skills/skill-creator/SKILL.md |
| Tailwind CSS v4 patterns | tailwind-4 | /Users/ricardoaltamirano/.claude/skills/tailwind-4/SKILL.md |
| Tailwind CSS v4 setup in Expo | tailwind-setup | /Users/ricardoaltamirano/.claude/skills/tailwind-setup/SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/ricardoaltamirano/Developer/SecondStream/AGENTS.md | Index — source of truth and doc map |
| docs/agents/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/README.md | Canonical agent docs entrypoint |
| docs/agents/development-commands.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/development-commands.md | Commands and checks |
| docs/agents/workflows.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/workflows.md | Common feature / migration workflows |
| docs/agents/architecture.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/architecture.md | Request flow, data model, key files |
| docs/agents/code-style.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/code-style.md | Style and naming defaults |
| docs/agents/debugging.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/debugging.md | Debugging guidance |
| docs/agents/environment-setup.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/environment-setup.md | Env vars and local setup |
| docs/agents/deployment.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/deployment.md | Deploy notes and constraints |
| docs/agents/performance.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/agents/performance.md | Performance defaults |
| docs/archive/README.md | /Users/ricardoaltamirano/Developer/SecondStream/docs/archive/README.md | Archive policy |
| CLAUDE.md | /Users/ricardoaltamirano/Developer/SecondStream/CLAUDE.md | Project guidance for Claude Code |

## Notes

- `.atl/` is already ignored in the repo root `.gitignore`.
- No project-level skill directories were present under the workspace root.
