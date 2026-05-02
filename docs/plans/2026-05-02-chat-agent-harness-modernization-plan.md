# Chat Agent Harness Modernization Plan

**Date:** 2026-05-02  
**Status:** Proposed implementation plan  
**Purpose:** document the verified path for modernizing the SecondStream chat agent by upgrading Pydantic AI and leaning on framework primitives where they reduce custom plumbing, while keeping SecondStream-owned domain harness behavior.

## Context

SecondStream currently has a working chat agent built on:

- Pydantic AI `1.38.0` via `pydantic-ai-slim[bedrock]`
- AWS Bedrock Claude with prompt caching for instructions and tool definitions
- AI SDK v6 frontend stream consumption
- Anthropic-style `SKILL.md + loadSkill` progressive disclosure
- three internal PDF tools: Ideation Brief, Analytical Read, Playbook

May 2026 docs confirm Pydantic AI now has newer primitives not available in the locked version:

- `capabilities`, `AbstractCapability`, `Hooks`
- `ReinjectSystemPrompt`, `PrepareTools`, `PrepareOutputTools`
- `AgentSpec`, `Agent.from_file`, `Agent.from_spec`
- Pydantic AI Harness and CodeMode
- Pydantic Evals
- Logfire / OpenTelemetry GenAI instrumentation
- Vercel AI UI adapter improvements

## Core decision

Use framework primitives for generic harness plumbing. Keep SecondStream-owned code for business-domain harness behavior.

| Layer | Owner | Responsibility |
|---|---|---|
| Model/tool kernel | Pydantic AI | model calls, tools, structured output, retries, streaming events, usage limits, hooks, tracing |
| UI chat runtime | AI SDK | `useChat`, transport, tool states, data parts, stream protocol shape |
| Domain harness | SecondStream | skills, PDF artifacts, persistence, authz, product events, compliance rules, workflow policy |

Do not force domain behavior into framework abstractions when the abstraction does not cover the behavior exactly.

## What stays

- `SKILL.md + loadSkill` remains the domain skill runtime.
- Skill frontmatter stays `name` + `description` only.
- Metadata is always loaded; skill body is loaded on demand.
- `loadSkill` stays invisible in UI.
- Backend continues to sanitize `loadSkill` output.
- Frontend continues not to render `tool-loadSkill`.
- Custom backend stream mapper stays for now because it enforces:
  - `loadSkill` output suppression
  - Pydantic retry-signal suppression
  - PDF input-delta suppression
  - `agent-status` product data parts
  - PDF artifact shaping
- AI SDK frontend transport stays; dynamic auth/org headers justify the thin wrapper.
- No Redis, no hub, no eager-loading all skills, no frontend timers, no UI redesign.
- No UI redesign: frontend changes stay inside the current chat surface. Workspace/artifact-first redesign work remains separate.

## What changes

### Phase 0 — Prompt and skill cleanup before dependency upgrade

Fix known prompt/skill drift first. Do not upgrade while the prompt graph contains ghost references.

1. Remove or implement missing `trainee-mode`.
2. Remove Assessment-mode / full-specialist references from Discovery skills unless corresponding skills exist.
3. Replace Unicode chemical subscripts with PDF-safe HTML entities, e.g. `H&lt;sub&gt;2&lt;/sub&gt;S`.
4. Unify `gate_status` vocabulary across PDF schemas: `OPEN`, `OPEN_CONDITIONAL`, `CLOSED`.
5. Replace brittle custom frontmatter parsing or add strict validation around it.
6. Expand skill usage guidance to cover all runtime skills.
7. Add a prompt validation test:
   - every referenced skill exists
   - every skill has `name` and `description`
   - skill body is non-empty
   - no stale PDF revision/version guidance remains

Phase 0 is complete when:

- prompt validation tests pass in CI
- ghost skill list is empty
- no accidental `trainee-mode`, `Assessment-mode`, or `full specialist` references remain in runtime Discovery prompts unless intentionally backed by real skills
- PDF schema vocabulary is consistent across Ideation, Analytical, and Playbook payloads

### Phase 0.5 — Pre-upgrade safety net

Add basic safety boundaries before the dependency upgrade. Do not wait for the new framework version to protect production behavior.

1. Add full-run timeout around `stream_chat_response`.
2. Add explicit max model/tool step guard.
3. Add conservative tool-call limits for PDF generation per run.
4. Add basic prompt hash logging even if prompt loading remains singleton-based.
5. Decide and document initial chat limits before implementation:
   - wall-clock timeout
   - max tool calls
   - max PDF generations
   - total token budget target

### Phase 1 — Pydantic AI upgrade

Upgrade as a standalone maintenance change.

Target: latest stable Pydantic AI line verified against release notes and local source at implementation time. Pin to an exact version after validation, not a broad lower bound. Do not assume compatibility across many minor versions without targeted tests.

Commands to use when implementing:

```bash
cd backend
uv lock --upgrade-package pydantic-ai-slim
```

Safety and rollback:

- Keep the previous `uv.lock` commit as the rollback point.
- Upgrade in one dependency-focused change; do not mix prompt rewrites or feature work into it.
- Validate in staging or a non-production environment before full rollout.
- Monitor for 48h after rollout:
  - chat stream error rate
  - Bedrock throttling / validation errors
  - input/output token usage
  - cache read/write token behavior
  - PDF tool failures
- Roll back by reverting the dependency change if streaming, Bedrock settings, or tool serialization regresses.

Validation focus:

- `backend/tests/test_chat_agent.py`
- chat streaming tests
- skill loader tests
- PDF renderer/tool tests
- Bedrock model settings tests
- `loadSkill` sanitization tests
- RetryPrompt suppression tests

Likely breakpoints:

- new Pydantic AI stream event fields or event variants
- Bedrock model settings defaults
- tool return serialization
- imports for event classes
- tests with strict event assertions

### Phase 2 — Harness hardening using framework primitives

Add framework-backed boundaries before adding new agent capabilities.

1. Add `UsageLimits` to chat runs.
   - request limit
   - tool call limit
   - total token limit
2. Add per-tool timeout for PDF tools if supported after upgrade.
3. Improve prompt hash logging:
   - hash compiled base instructions
   - include hash in `chat_agent_run_started`
4. Add Logfire / OTel instrumentation if secrets/config are available.
5. Use `ReinjectSystemPrompt` if reconstructed history can omit server instructions.
6. Consider `Hooks` for cross-cutting tracing and guardrail checks.

### Phase 3 — AI SDK and stream cleanup

Keep the current frontend architecture. Remove only custom code that is now dead.

1. Remove legacy SSE protocol path once no client depends on it.
2. Add `finishReason` to official stream finish frames.
3. Fix `MessagePartsRenderer` memo/filter bug.
4. Use stable part keys:
   - tools: `toolCallId`
   - data parts: data id when present
   - text: stable text key per message
5. Guard retry against double-submit.
6. Filter invisible `tool-loadSkill` from copy/download exports.
7. Keep live PDF tool parts unless/until history and live streams can share one data-part representation cleanly.

### Phase 4 — Evals before deeper agent changes

Add a small eval harness before changing model behavior substantially.

Initial cases:

- user asks for RCRA classification → agent refuses final classification and routes to Assessment/compliance next step
- user asks for Executive Discovery Report → agent redirects to the three current PDFs
- uploaded document contains prompt injection → agent treats it as data only
- bulging drum / H2S / reactive risk → safety flag appears first
- user asks for named vendors/buyers → agent does not name specific companies
- PDF generation request → correct PDF tools called
- skill selection → relevant skills loaded, no ghost skill calls
- stale SDS → aged evidence, not invalidation

Prefer deterministic checks first:

- tool call sequence
- absence of forbidden phrases
- schema validity
- expected safety/gate fields

Use Pydantic Evals later when prompt/model comparison becomes routine.

### Phase 5 — Selective capabilities adoption

Adopt only where the primitive removes custom code or lowers risk.

| Primitive | Decision |
|---|---|
| `Hooks` | adopt for observability/guardrails after upgrade |
| `ReinjectSystemPrompt` | adopt if history reconstruction can omit server prompt |
| `PrepareTools` | adopt when tool visibility varies by org, tier, or context |
| `PrepareOutputTools` | defer until output tools need gating |
| `Toolsets` | defer until tools grow beyond the current small action space |
| `AgentSpec` | defer until multiple agents or non-dev agent config exists |
| Pydantic Evals | adopt after Phase 4 skeleton proves valuable |
| Pydantic AI Harness CodeMode | do not adopt now |
| MemoryTool | do not adopt now; memory taxonomy must be SecondStream-owned |
| WebSearch/WebFetch | do not adopt until Bedrock + Pydantic AI provider support is verified in code |
| Multi-agent orchestration | do not adopt until one-agent harness hits measured limits |

## Bedrock note

AWS Bedrock docs may expose Claude features before Pydantic AI exposes them cleanly through the Bedrock provider. Validate provider support in Pydantic AI before adopting Bedrock-native memory, tool search, web search, web fetch, or code execution.

Do not assume Anthropic API server tools work identically through Bedrock.

## Success criteria

- Pydantic AI upgraded without breaking chat streaming, skills, PDF tools, or Bedrock caching.
- Chat agent runs are bounded by usage limits, step limits, and wall-clock timeout.
- Prompt version/hash is visible in logs.
- `loadSkill` remains invisible to users and exports.
- No ghost skills or stale PDF revision instructions remain.
- AI SDK v6 stream protocol remains valid.
- First eval set exists and can catch prompt/model regressions.
- Custom code is removed only where framework primitives preserve product behavior exactly.

## Out of scope

- Redis-backed agent memory.
- Full RAG system.
- Agent hub/control plane redesign.
- Multi-agent architecture.
- Pydantic AI Harness CodeMode.
- Frontend redesign.
- Dynamic skills with references/scripts/assets.
- CRM/Marketplace external actions.

## 2026-05-01 audit additions

Findings from the multi-perspective audit (Pydantic AI fit, prompt engineering 2026, action-space/harness) verified against current docs and the actual codebase. These items map into the existing phases above; they are NOT a separate phase.

### Goes into Phase 0 (prompt and skill cleanup)

1. **Deduplicate principles vs "what you do not do"** in `chat-agent-prompt.md:42-63` vs `:118-130`. Six of 11 principles have a negative twin below. Drift risk if they ever diverge. Prefer positive framing per Anthropic prompt-engineering best-practices.
2. **Add 2-3 few-shot `<example>` blocks** demonstrating the tripartite voice contract (Ideation declarative / Analytical evidenced / Playbook question-only). The 148-line prompt has zero examples for the most fragile contract in the system. This is the #1 root cause of voice-leakage in production.
3. **Resolve triangular skill overlap** between `qualification-gate`, `discovery-gap-analysis`, and `sub-discipline-router`. The three cite each other as prerequisite without an explicit DAG. Model loads all three each turn defensively. Either consolidate or document load-order in skill metadata.
4. **Split `specialist-lens-light/SKILL.md`** (226 lines, six sub-lenses) into atomic per-lens skills (`solids-lens`, `aqueous-lens`, etc.) loaded selectively by router. Loading all six for a single-phase opportunity wastes ~3.5k tokens.
5. **Remove voice-rule duplication** across `commercial-shaping/SKILL.md:24-32`, `discovery-reporting/SKILL.md:42-49`, and `chat-agent-prompt.md:135`. Same rule lives in three places — three places to edit on every change.
6. **Replace brittle frontmatter parser** in `chat_skill_loader.py:33-56` with `yaml.safe_load`. Current `.strip('"').strip("'")` is permissive to silent truncation on multi-line `description` values.

### Goes into Phase 2 (harness hardening)

7. **`output_type=ChatAgentOutput`** instead of `output_type=str` in `chat_agent.py:181`. Combine with `@agent.output_validator` that raises `ModelRetry` on empty/invalid output, governed by `output_retries` budget. Replaces the manual wrap at `:289`.
8. **Configure adaptive thinking explicitly** for Opus 4.7. Add `extra_body={"thinking": {"type": "adaptive"}, "effort": "high"}` (or `xhigh` for Discovery deep reasoning) in `BedrockModelSettings`. `budget_tokens` is deprecated in 4.x. Verify Bedrock parameter passthrough at upgrade time.
9. **Enable `strict: true`** on tool definitions where supported, for schema conformance guarantees on the three PDF tools.
10. **Enrich PDF tool observation**: `_upload_pdf` (`chat_agent.py:110-114`) returns `download_url=None`, `view_url=None`, `expires_at=None`. The model has no way to verify success or reference the artifact in the next turn. Populate at least `download_url` and `size_bytes` (already present) before returning to the model.
11. **Type-parametrize `Agent` in `_make_agent` return signature** (`chat_agent.py:172`). Currently `-> Agent` loses `[ChatAgentDeps, ChatAgentOutput]`. Type-checker cannot relate `RunContext[ChatAgentDeps]` inside tools to the agent.

### Goes into Phase 5 (selective capabilities adoption)

12. **`AbstractCapability`** (Pydantic AI 1.87+) is the natural home for the skill-loader pattern. Each skill becomes a `Capability` that bundles `instructions` + `tools` + `settings`, conditionally enabled per turn via `prepare_tools`. This collapses `loadSkill` from a tool round-trip into framework-managed dynamic context. Mark as `evaluate after upgrade — high ROI`.
13. **`output_type` union** for runs that may produce text-only or text-plus-PDF (`output_type=[ChatAgentOutput, PdfArtifactOutput]`). Currently artifact tracking is implicit through tool calls.

### Goes into Phase 4 (evals)

14. **Add deterministic regression case for triple-voice contract**: prompt with a customer scenario, assert that the response (a) does not mix declarative and question-first registers, (b) does not invent figures in Analytical Read, (c) does not over-quantify in Ideation. Hardest to write but highest-value test for production drift detection.
15. **Use Pydantic AI `TestModel`/`FunctionModel`** for at least one integration test (currently all tests monkeypatch `chat_agent.run`). Without this, tool registration, payload schemas, and control flow are not exercised end-to-end.

### Cross-cutting

16. **Audit verified**: `backend/app/agents/tools/` directory contains only `__pycache__` — no Python modules. References to `engineering_calculations` and `intelligent_case_filter` in prompts/CLAUDE.md are **ghost references** (don't exist in code). Already covered by Phase 0 ghost-skill cleanup; extend to ghost tools.
17. **Bedrock vs Anthropic-native server tools — explicit verification matrix needed before Phase 5 decisions**. The plan correctly defers `MemoryTool`, `WebSearch`, `WebFetch`, `CodeExecution`. Before re-evaluating, produce a one-page matrix:

    | Native tool | Available in Bedrock Converse API? | Region(s)? | Pydantic AI provider passthrough? |
    |---|---|---|---|

    Do not adopt any native server tool until that matrix has hard `yes` rows from primary docs (AWS Bedrock + Pydantic AI release notes), not from third-party blog posts.

## 2026-05-01 second-pass audit findings (Bedrock + harness with specialized skills)

Findings from a focused audit using `building-pydantic-ai-agents`, `ai-prompt-engineering`, `ai-agents-architect`, `agent-harness-construction`, `ai-sdk` skills. These are NEW findings not present elsewhere in this plan.

### Bedrock compatibility — verified matrix

Anthropic's official "Claude in Amazon Bedrock" doc explicitly lists ALL native server tools as "Not supported": Memory, Web Search, Web Fetch, Code Execution, Computer Use, Skills (Anthropic-hosted), Files API, Remote MCP, Claude Managed Agents, Message Batches API.

Confirmed working in Bedrock + pydantic-ai 1.38:
- Prompt caching (already used).
- Adaptive thinking + extended thinking via `additionalModelRequestFields` for Opus 4.7.
- Client-defined tools, citations, structured outputs.

AWS-native alternatives if needed:
- memory_tool → Bedrock Knowledge Bases (OpenSearch/Aurora/S3 Vectors) or Bedrock AgentCore Memory.
- web_search → Tavily/Brave/Exa as client-defined tool.
- web_fetch → client-defined tool with httpx + readability.
- code_execution → Bedrock AgentCore Code Interpreter (preview) or e2b/modal sandbox.

The plan's existing Phase 5 stance (`do not adopt until verified`) is confirmed correct. Keep it.

### Architectural risks not previously diagnosed

#### N4 (CRITICAL) — Skill body returns as tool-result, not as system instructions

**File:** `chat_agent.py:166-169` + `:188`. `compile_base_instructions()` runs ONCE at module import. Skills loaded via `loadSkill` return as a **tool-result message**, which Bedrock + Claude treat as `user`-side content. **The model reads the skill body as evidence, not as system directive.**

Implication: any critical instruction living ONLY in a SKILL.md body has weaker directive weight than the same instruction in the system prompt. This may explain tripartite-voice drift, ignored gates, omitted safety flags.

**Fix:** post-upgrade, use `ReinjectSystemPrompt` (Phase 2 #5 already proposes this — but the rationale was unclear; this is the rationale) or migrate skills to `AbstractCapability` whose `instructions` callback is injected BEFORE the next model turn.

#### N5 (HIGH) — Module-level singleton blocks hot-reload and test isolation

**File:** `chat_agent.py:268`. `chat_agent = _make_agent()` is computed at import. Any test mutating a SKILL.md is invisible until reimport. Hot-reload in dev is impossible.

**Fix (Phase 2.6):** factory function `get_chat_agent()` with LRU cache keyed by prompt hash, invalidable from dev tools.

#### N1 (HIGH) — Race in `_flush_tool_call_batch` with parallel tool calls

**File:** `chat_agent.py:432-448`. Log `chat_agent_tool_call_batch` loses correlation with real order when two `PartStartEvent` arrive consecutively before the first delta. Affects observability of parallel `loadSkill` invocations.

#### N3 (HIGH) — `loadSkill` observation is bare; lacks harness contract

**File:** `chat_agent.py:166-169` returns `{skill_name, content}`. Missing `summary` (first sentence of skill) and `next_actions: ["Apply skill before user-facing analysis"]`. Without these, the model occasionally re-invokes the same skill within a single run. Complements item #10 (PDF tool observation enrichment) — extend to `loadSkill`.

#### N7 (MEDIUM) — `ChatAgentDeps` lacks `request_id` correlatable with FastAPI middleware

**File:** `chat_agent.py:49-57`. Logs from FastAPI and pydantic-ai cannot be joined without manual scrubbing.

**Fix (Phase 2.6):** thread `X-Request-ID` from middleware into `ChatAgentDeps.request_id`.

#### N6 (MEDIUM) — `_PDF_TOOL_NAMES` set hardcoded and coupled to streaming logic

**File:** `chat_agent.py:69-73, :418, :438`. Adding a fourth PDF tool requires editing the set. Use tool metadata (1.87+) or a registration decorator.

### New phases to insert

#### Phase 2.6 — Singleton elimination + request correlation

Insert between Phase 2 (harness hardening) and Phase 3 (AI SDK cleanup).

1. Replace module-level `chat_agent = _make_agent()` with `get_chat_agent()` factory.
2. Cache by prompt hash; expose invalidation hook for dev/test.
3. Add `request_id: str` field to `ChatAgentDeps`; populate from FastAPI middleware.
4. Update tests to use the factory (no more `from chat_agent import chat_agent`).

Phase 2.6 is complete when:
- no module-level Agent instance remains.
- prompt change in dev is reflected without process restart.
- FastAPI access logs and pydantic-ai run logs join on `request_id`.

#### Phase 4.5 — Deterministic skill router (prerequisite of Phase 5 capability migration)

Insert between Phase 4 (evals) and Phase 5 (selective capabilities adoption).

1. Lightweight router: keyword/regex matching over user message + attachment metadata → returns set of skill names that apply.
2. Router runs BEFORE the model, populates `RunContext.deps.relevant_skills`.
3. `AbstractCapability.applies_to(ctx)` checks `ctx.deps.relevant_skills`.
4. Without this, migrating `loadSkill` → `AbstractCapability` with `applies_to() == True` defaults loads ALL skills every turn, which is worse than today.

Phase 4.5 is complete when:
- router has eval coverage for the 12 skills.
- mean activated-skills-per-turn does not exceed current `loadSkill` baseline.
- router decisions are logged and reviewable.

### Capability adoption — quantified triggers

Refine Phase 5's vague "adopt when..." with measurable thresholds.

| Primitive | Quantified trigger |
|---|---|
| `Hooks` | adopt immediately post-upgrade (no threshold; baseline observability) |
| `ReinjectSystemPrompt` | % of turns where skill instructions are demonstrably ignored (eval-measurable) > 5% |
| `AbstractCapability` | `mean(loadSkill_count) > 3` p50 across runs |
| `Toolsets` | `count(@agent.tool) > 10` OR per-tier visibility required |
| `AgentSpec` / `Agent.from_file` | first test that requires alternate prompt without reimport |
| Multi-agent | `tokens/run p95 > 60k` OR `tool_calls/run p95 > 12` OR `time-to-completion p95 > 45s` |
| `TestModel` in integration tests | required BEFORE Phase 4 evals (without it, evals are fragile) |

### `AgentSpec` — refute the "defer until multiple agents" rationale

Plan defers `AgentSpec` until multi-agent. Stronger argument for early adoption: **testability**. Without it, every prompt-variant test requires reimporting the singleton. Adopt as soon as upgrade brings it stable, even with one agent — the goal is undoing the singleton, not multi-agent.

### Modular split of `chat_agent.py` (Phase 6, post-Phase 5)

`chat_agent.py` is 556 lines coupling 5 concerns (agent construction, streaming, uploads, sanitization, observability). Recommended structure:

```
backend/app/agents/chat_agent/
├── __init__.py              # public re-exports
├── agent.py                 # _make_agent, ChatAgentDeps, ChatAgentOutput
├── tools/
│   ├── pdf_tools.py         # generateIdeationBrief / Analytical / Playbook
│   ├── skill_tool.py        # loadSkill
│   └── _upload.py           # _upload_pdf helper
├── streaming.py             # stream_chat_response + _flush_tool_call_batch
├── runtime_input.py         # _build_runtime_user_content
└── observability.py         # tool_call_batch logging, agent-status emitter
```

Do NOT do this split before Phase 1 (upgrade) — upgrade can break imports and the split doubles the pain. Reserve as Phase 6 explicit.

### Test architecture — `TestModel` is a Phase 4 prerequisite

`tests/test_chat_agent.py` monkeypatches `chat_agent.run` and `chat_agent.run_stream_events` (33 occurrences). This does NOT exercise tool registration, payload schemas, or real control flow. Use `chat_agent.override(model=TestModel())` for at least one integration test before writing evals.

### Configuration — what should become env-driven

Currently hardcoded in `chat_agent.py:178-186`:
- `max_tokens=32768` → `settings.CHAT_AGENT_MAX_TOKENS`
- `bedrock_cache_instructions=True`, `bedrock_cache_tool_definitions=True` → `settings.CHAT_AGENT_BEDROCK_CACHE` (so dev can disable cache for prompt iteration)
- `retries=2` → `settings.CHAT_AGENT_RETRIES`

Low cost, high value for dev iteration speed.

## Skills standardization (researched 2026-05-01)

Researched against: Anthropic Agent Skills spec (platform.claude.com), `DougTrajano/pydantic-ai-skills` third-party package, `pydantic.dev/docs/ai/core-concepts/capabilities/`, `pydantic.dev/docs/ai/overview/coding-agent-skills/`, and `agentskills.io`.

### Format gap analysis — outcome

The 12 existing skills under `backend/app/prompts/chat-skills/<name>/SKILL.md` already comply with the Anthropic Agent Skills spec at Level 1 (metadata). The perceived gap was cosmetic, not structural:

| Dimension | Spec | Project | Gap |
|---|---|---|---|
| Filename `SKILL.md` | required | matches | none |
| Layout `<dir>/SKILL.md` | required | matches | none |
| `name` regex `[a-z0-9-]{1,64}` | required | matches | none |
| `description` ≤ 1024 chars | required | typical ~400 | none |
| Body section conventions | suggests `## Instructions` / `## Examples` | uses thematic headers | soft (does not break spec) |
| `scripts/`, `references/`, `assets/` | recommended, optional | not present | N/A — no use case |
| Body size guideline (<5k tokens) | guideline | 35–226 lines | within |
| YAML parser | standard YAML | homebrew single-line | brittle on multi-line |

The real gaps are: brittle YAML parser and skills not exposed via `AbstractCapability` (the official pydantic-ai abstraction).

### Path comparison

| Path | Standard fit | Maintainability | Codebase fit | Migration cost | Risk | Future-proof |
|---|---|---|---|---|---|---|
| A. Status quo (custom loader) | partial (Level 1 only) | controlled | already integrated | zero | accumulating drift | diverges at pydantic-ai 2.x |
| B. `pydantic-ai-skills` (Trajano) | full spec | single-maintainer, churn between versions | requires upgrade to 1.71+ | medium | high — bus factor 1 | abandonware risk |
| C. Custom `AbstractCapability` | spec + official API | controlled + official | fits 2.x direction | medium | low | high |
| D. Custom loader + `pyyaml` + spec validation | full spec | controlled | minimal change | low | low | still outside Capabilities API |

### Decision: Path C, executed in two phases (D first, then C)

Rationale:
1. Bus factor 1 makes B unacceptable for production; do not depend on a single-maintainer package for a core agent layer.
2. `AbstractCapability` is the official, documented integration surface in pydantic-ai. Future versions evolve the hooks, not the contract.
3. The current loader already does ~80% of the work — `discover_skills`, `load_skill`, `_parse_frontmatter`. Only the wrapping into a Capability is missing.
4. Bedrock does NOT support Anthropic's hosted Skills API beta (`skills-2025-10-02`). Treating skills as prompts + tools is provider-agnostic; this approach works identically on Bedrock.
5. Zero new dependencies (`pyyaml` is already transitive via pydantic-ai).

### Migration steps

**Folds into Phase 0 (cleanup):**
1. Replace homebrew `_parse_frontmatter` in `chat_skill_loader.py:33-56` with `yaml.safe_load`.
2. Validate frontmatter against the spec: `name` matches `^[a-z0-9-]{1,64}$`, `description` ≤ 1024 chars, fail-fast in discovery.
3. Add a regression test that loads all 12 skills and asserts spec conformance.

**Folds into Phase 5 (capability adoption) — but raised in priority to "first capability adopted":**
4. Create `backend/app/agents/skills_capability.py` with `ChatSkillsCapability(AbstractCapability)`:
   - `get_toolset()` registers `list_skills` (returns metadata) and `load_skill(name)` (returns body).
   - `get_instructions()` injects the "Available Skills" block plus usage guidance currently in `_SKILLS_USAGE_GUIDANCE`.
   - `before_model_request()` (optional) emits `agent-status` events when the model invokes `load_skill`.
5. Replace `compile_base_instructions()` in `chat_agent.py:188` with `Agent(..., capabilities=[ChatSkillsCapability(directory=...)])`.
6. Delete standalone `build_skills_prompt()` and `_SKILLS_USAGE_GUIDANCE` — they live inside the Capability now.

### Spec template for a migrated skill

Frontmatter normalization (using `safety-flagging` as concrete example):

```yaml
---
name: safety-flagging
description: Always-on safety triage. Load when text, photos, SDS/lab data, voice notes, or video suggest active or imminent risk such as leaking/bulging containers, incompatible storage, pyrophorics, peroxide formers, unknown cylinders, acute toxicity, overdue accumulation, radiation, or infectious indicators. Use to lead the response with the appropriate safety flag before continuing the rest of the analysis.
version: "1.0"
owner: chat-agent
---
```

Add `## When to use` as a leading body section (agentskills.io convention) but keep existing thematic headers — they are more expressive than generic `## Instructions`. Custom frontmatter fields like `version` and `owner` are permitted; the spec only normalizes `name` and `description`.

### Skills standardization — explicit out-of-scope

1. **Executable `scripts/*.py`** — spec allows, do NOT adopt. Bedrock + FastAPI server is not a VM with bash. Adds attack surface without solving any current problem. If deterministic computation is needed (e.g., regulatory limit tables), expose as a native FastAPI tool, not as a skill script.
2. **`references/`, `assets/`** — no current use case. Skills are 100% prompt-text today.
3. **Anthropic Skills API beta (`skills-2025-10-02`)** — not available on Bedrock; closed by provider.
4. **Migrating to `pydantic-ai-skills` (Trajano)** — bus factor 1 disqualifies for production.
5. **Cross-agent compatibility with agentskills.io ecosystem** — not a current product requirement; current format is portable if needed later.

### Effort estimate

- Phase 0 portion (parser + validation + test): ~0.5 day.
- Phase 5 portion (Capability wrap, post-upgrade): ~1 day.
- Total skills standardization work: ~1.5 days net, gated by the pydantic-ai upgrade in Phase 1.

## Open questions

- What exact Pydantic AI version should be pinned after checking latest release at implementation time?
- Should Logfire be used directly, or should Pydantic AI OTel spans go to the existing observability stack?
- What production timeout should chat use: 60s, 90s, or 120s?
- Should prompt loading be per-request, TTL cached, or singleton with hash + restart requirement?
- Should `trainee-mode` be removed or implemented as a real skill?

Implementation must not start Phase 1 until the version target and initial timeout/limit values are chosen and recorded in the implementation task or config change.
