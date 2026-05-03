# Chat Agent Harness Modernization Progress

**Date:** 2026-05-03  
**Status:** implementation progress + pending research handoff  
**Parent plan:** `docs/plans/2026-05-02-chat-agent-harness-modernization-plan.md`

## Goal

Record what has already changed before the next standards audit of SecondStream's chat agent skills, prompts, tools, stream protocol, and harness architecture.

## Current direction

- Keep the product on a single SecondStream chat agent for now.
- Use framework primitives where they remove generic plumbing.
- Keep SecondStream-owned behavior where it is domain/product policy:
  - `SKILL.md` skills and progressive disclosure.
  - Invisible `loadSkill` UX.
  - PDF tools and artifact persistence.
  - Auth, org scoping, thread persistence, and compliance boundaries.
  - Custom stream filtering where the AI SDK/Pydantic AI primitives do not preserve behavior exactly.
- Do not add Redis, RAG, multi-agent orchestration, frontend timers, eager skill loading, or hosted Anthropic server tools unless justified by verified provider support and product need.

## Implemented so far

### Phase 0 — prompt and skill cleanup

- Replaced the custom skill frontmatter parser with `yaml.safe_load`.
- Validated skill frontmatter against the Agent Skills metadata contract:
  - `name` matches `^[a-z0-9-]{1,64}$`.
  - `description` is required and at most 1024 chars.
- Added fail-fast `SkillSpecError` for malformed skills.
- Added tests for skill spec conformance, invalid names, quoted YAML descriptions, non-mapping frontmatter, ghost references, and unicode chemical subscripts.
- Removed `trainee-mode` as a ghost reference.
- Removed runtime prompt references that sounded like nonexistent modes/tools:
  - `Assessment-mode`
  - `full specialist`
  - `full-specialist`
- Preserved the actual business boundary: Discovery can flag issues, but final classification/routing/compliance remains post-Discovery review.
- Normalized `AnalyticalReadPayload.gate_status` to `Literal["OPEN", "OPEN_CONDITIONAL", "CLOSED"] | None`.
- Replaced runtime unicode `H₂S` with `H2S` where appropriate; `discovery-reporting` remains the canonical place for PDF HTML entity guidance.

### Phase 1 — Pydantic AI upgrade

- Upgraded backend dependency set to Pydantic AI `1.89.1`.
- Synchronized production requirements with the new dependency graph:
  - `pydantic==2.12.5`
  - `pydantic-settings==2.12.0`
  - `boto3/botocore==1.43.2`
  - `s3transfer==0.17.0`
- Removed orphaned async AWS dependencies:
  - `aioboto3`
  - `aiobotocore`
  - `aiohttp`
- Migrated `s3_service.py` to sync `boto3` calls wrapped with `asyncio.to_thread` while preserving the public async API.
- Migrated Pydantic `class Config` occurrences to `model_config = ConfigDict(...)` in touched schemas.
- Rebuilt Docker image and verified the container uses the new versions.

### Phase 2 — harness hardening baseline

- Added Pydantic AI `UsageLimits` to both non-streaming and streaming chat runs:
  - `request_limit=10`
  - `tool_calls_limit=20`
  - `response_tokens_limit=32768`
- Converted `UsageLimitExceeded` to `ChatAgentError`.
- Added Pydantic AI tool timeouts:
  - default `tool_timeout=30`
  - PDF tool timeout `120s`
- Added 16-char SHA-256 prompt hash logging.
- Typed `_make_agent()` as `Agent[ChatAgentDeps, str]` without changing output behavior.

### Phase 2.6 — singleton elimination and request correlation

- Removed the module-level `chat_agent` singleton.
- Added `get_chat_agent()` with bounded prompt-hash cache.
- Added `clear_chat_agent_cache()` for tests/dev.
- Added `get_chat_agent_prompt_hash()`.
- Added `request_id` to `ChatAgentDeps` and relevant chat agent logs.
- Updated tests to monkeypatch `get_chat_agent()` rather than a global singleton instance.

### Phase 3 — AI SDK stream cleanup

- Removed legacy chat SSE protocol handling.
- Kept the official AI SDK UI/Data Stream Protocol v1 as the canonical stream contract.
- Added `finishReason: "stop"` to official finish frames.
- Updated backend stream/API tests away from the legacy adapter.
- Fixed frontend chat retry guard to avoid double-submit while busy.
- Fixed `MessagePartsRenderer` memo/key behavior for more stable rendering:
  - tool keys use `toolCallId`.
  - data keys prefer stable data identifiers.
  - text keys use the message id.

## Verification already run

- Docker app rebuilt and healthy with Pydantic AI `1.89.1`.
- `docker compose exec -T app pytest tests/test_chat_agent.py -q` → passing.
- `docker compose exec -T app pytest tests/agents/test_chat_skill_loader.py -q` → passing.
- `docker compose exec -T app pytest tests/test_chat_stream_protocol.py tests/test_chat_api.py tests/test_data_new_thread_created_event.py -q` → passing.
- `bun run lint` in `frontend/` → passing.
- `npx tsc --noEmit` in `frontend/` → passing.

## Warnings / cleanup still visible

- `pytest_asyncio` loop-scope deprecation.
- Custom `event_loop` fixture redefinition warning.
- `PyPDF2` deprecation; migrate to `pypdf` later.
- Pydantic `UnsupportedFieldAttributeWarning` from field aliases attached in unsupported contexts.

## Still unvalidated

- Bedrock real non-streaming call.
- Bedrock real streaming call.
- Real `loadSkill` tool call through Bedrock.
- Real S3 upload/download/delete with current boto3 service.
- Real PDF generation + upload + stream event shape.
- Attachment binary/document input with real provider constraints.

## Current research question

The next investigation should re-audit whether SecondStream's skill and harness design matches May 2026 standards across:

- Anthropic Agent Skills.
- AgentSkills open standard.
- AI SDK v6 chat/tool stream patterns.
- Pydantic AI `capabilities`, `AgentSpec`, Harness, and Coding Agent Skills.
- Third-party `pydantic-ai-skills` package.
- Skill handling in other agent systems such as Claude Code, OpenCode, Codex, OpenClaw, and `pi`.

The key question is not whether SecondStream can wrap current skills in an abstraction. The key question is: **what is the most standard, modern, maintainable, production-ready way to represent, load, route, test, and observe skills in a Bedrock-backed Pydantic AI chat agent without losing progressive disclosure or product-specific stream behavior?**

## Constraints for the next plan

- Do not eager-load all skill bodies.
- Do not remove invisible `loadSkill` unless there is a proven replacement that preserves progressive disclosure and UI behavior.
- Do not assume Anthropic hosted Skills API works through Bedrock.
- Do not adopt a third-party package without assessing bus factor, maintenance, API fit, and migration risk.
- Do not introduce multi-agent, RAG, memory, or code execution unless the audit shows a measured need.
