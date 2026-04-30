# Post-Stabilization: Folder-Per-Skill Migration Plan

## Context

Agent Skills currently live as flat `.md` files under `backend/app/prompts/chat-skills/`. Each file carries YAML frontmatter (`name`, `description`) followed by the skill body. The `chat_skill_loader.py` module discovers and loads these files at runtime.

## Objective

After the chat agent progressive-disclosure stabilization is complete, migrate to a **folder-per-skill** structure that supports richer metadata, optional references, and future extensibility (tests, scripts, versions) without breaking the existing discovery contract.

## Target Structure

```
backend/app/prompts/chat-skills/
  safety-flagging/
    SKILL.md          # frontmatter + body (same contract as today)
    references/       # optional supporting docs (no scripts/bash)
      example-1.md
      example-2.md
  qualification-gate/
    SKILL.md
  ...
```

## Rules

1. **SKILL.md is required** in every skill folder. It is the only file the loader reads for the skill body.
2. **`references/` is optional** and contains markdown supporting documents only. No executable scripts, no bash, no Python.
3. **Frontmatter contract stays unchanged**: `name`, `description` (and any future scalar metadata) live in `SKILL.md` frontmatter.
4. **Discovery logic update**: `discover_skills()` walks folders instead of globbing `*.md`, but returns the same `SkillMetadata` list.
5. **No references exposed to the model** unless explicitly loaded. The `loadSkill` tool continues to return only `SKILL.md` body.
6. **Backward compatibility**: during migration, support both flat files and folders; deprecate flat files in a follow-up change.

## Migration Steps (post-stabilization)

1. Update `chat_skill_loader.py` `discover_skills()` to prefer folders, fallback to flat files.
2. Move each existing skill into its own folder with `SKILL.md`.
3. Populate `references/` only where there is existing supporting content worth keeping.
4. Update tests in `test_chat_skill_loader.py` to cover both layouts.
5. Remove flat-file fallback once all skills are migrated.

## Out of Scope

- Scripts, bash hooks, or executable attachments in skill folders.
- Versioning or branching within a skill folder.
- Dynamic skill installation at runtime.

## Rationale

Folder-per-skill makes the codebase more AI-navigable (each skill is a directory with a canonical entrypoint), separates body from references, and opens the door to future non-executable additions (e.g., structured examples, test cases) without changing the runtime contract.
