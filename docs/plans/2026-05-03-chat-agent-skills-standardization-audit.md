# Chat Agent Skills Standardization Audit

**Date:** 2026-05-03  
**Status:** Decision record + cleanup checklist  
**Scope:** Backend skill runtime, frontend chat rendering, test hygiene.

---

## Objective

Decide how SecondStream should position itself relative to emerging Agent Skills standards (Anthropic/AgentSkills.io, Pydantic AI native, `pydantic-ai-skills` third-party) and execute safe, non-functional cleanup left over from earlier chat-stream migration phases.

---

## Current State — SecondStream

### Skill runtime (production today)
- **Location:** `backend/app/agents/chat_skill_loader.py`
- **Pattern:** folder-per-skill under `backend/app/prompts/chat-skills/`
- **Format:** `SKILL.md` with YAML frontmatter (`name`, `description`)
- **Discovery:** `discover_skills()` reads frontmatter, validates spec regex, fails fast at import time
- **Loading:** `load_skill(name)` strips frontmatter, returns body on demand
- **Progressive disclosure:** metadata always injected into system prompt; body loaded only when model calls `loadSkill` tool
- **UI visibility:** `loadSkill` is invisible — backend sanitizes output to `{"skill_name": "...", "status": "loaded"}`; frontend has no renderer for `tool-loadSkill`
- **Count:** 12 skills (see inventory below)

### Skill inventory

| Skill | Folder | Frontmatter | Body loaded on demand |
|---|---|---|---|
| analytical-read | `analytical-read/` | `name` + `description` | Yes |
| commercial-shaping | `commercial-shaping/` | `name` + `description` | Yes |
| discovery-gap-analysis | `discovery-gap-analysis/` | `name` + `description` | Yes |
| discovery-reporting | `discovery-reporting/` | `name` + `description` | Yes |
| ideation-brief | `ideation-brief/` | `name` + `description` | Yes |
| multimodal-intake | `multimodal-intake/` | `name` + `description` | Yes |
| playbook | `playbook/` | `name` + `description` | Yes |
| qualification-gate | `qualification-gate/` | `name` + `description` | Yes |
| safety-flagging | `safety-flagging/` | `name` + `description` | Yes |
| sds-interpretation | `sds-interpretation/` | `name` + `description` | Yes |
| specialist-lens-light | `specialist-lens-light/` | `name` + `description` | Yes |
| sub-discipline-router | `sub-discipline-router/` | `name` + `description` | Yes |

### Chat stream protocol
- **Format:** AI SDK UI/Data Stream Protocol v1 (official) only. Legacy format was removed in Phase 3.
- **Adapter:** `backend/app/services/chat_stream_protocol.py` — custom mapper, justified because it enforces:
  - `loadSkill` output suppression (invisible skill loading)
  - `RetryPromptPart` suppression (Pydantic AI retry signals must not reach client)
  - PDF tool input-delta suppression
  - `agent-status` product data parts
  - PDF artifact shaping

### Frontend
- AI SDK v6 `useChat` with thin auth/org header wrapper
- `MessagePartsRenderer` handles text, reasoning, file, PDF tools, working-memory updates, data parts
- No renderer for `tool-loadSkill` (by design)

---

## Standards Matrix

| Dimension | Anthropic Agent Skills | AgentSkills.io | Pydantic AI native | `pydantic-ai-skills` | SecondStream today |
|---|---|---|---|---|---|
| **Folder structure** | `skill-name/SKILL.md` | Same | No opinion | Same | Same |
| **Frontmatter** | YAML `name` + `description` | Same | No opinion | Same | Same |
| **Metadata loading** | Always | Always | N/A | Always | Always |
| **Body loading** | On demand | On demand | N/A | On demand | On demand |
| **Resources** | Optional `resources/` | Optional | N/A | Optional | Not used |
| **Scripts** | Optional `scripts/` | Optional | N/A | Optional | Not used |
| **Assets** | Optional `assets/` | Optional | N/A | Optional | Not used |
| **Runtime loader** | Spec only | Spec only | No native loader | `load_skill`, `read_skill_resource`, `run_skill_script` | Custom `chat_skill_loader.py` |
| **Validation** | Spec regex | Spec regex | N/A | Frontmatter + folder structure | Spec regex |
| **Progressive disclosure** | Yes | Yes | N/A | Yes | Yes |
| **Invisible loading** | Not specified | Not specified | N/A | Tools are visible by default | Custom: `loadSkill` sanitized in stream mapper |
| **Framework coupling** | None | None | Tight (Pydantic AI) | Tight (Pydantic AI) | Loose: custom loader + Pydantic AI agent |
| **Stream semantics** | N/A | N/A | Native events | Native events | Custom mapper for product events |

**Conclusion from matrix:** SecondStream already satisfies the core Anthropic/AgentSkills.io spec for authoring and progressive disclosure. The main gap is a standardized runtime loader. Pydantic AI does not provide one natively; `pydantic-ai-skills` is the only third-party implementation that follows the spec.

---

## Decision

1. **Standardize authoring and validation first.** Our 12 skills already follow the folder-per-skill + frontmatter convention. We will formalize this with a template, checklist, and automated tests so new skills stay compliant regardless of which runtime loader we use.
2. **Spike `pydantic-ai-skills` before adoption.** It could reduce custom loader code, but it is a third-party dependency with unverified behavior around script execution, stream visibility, and SecondStream-specific semantics (invisible `loadSkill`, retry suppression, `agent-status`).
3. **Do NOT eliminate `loadSkill` or eager-load bodies.** Progressive disclosure is a product requirement, not a technical preference. Keeping bodies out of the context window until needed reduces token usage and improves latency.
4. **Do NOT adopt `pydantic-ai-skills` in production without the spike criteria below being met.**

---

## Proposed Plan

### 1. Skills authoring standardization

- [ ] Create `backend/app/prompts/chat-skills/TEMPLATE.md` with frontmatter schema, body structure, and examples
- [ ] Add `docs/agents/skills-authoring-checklist.md` with:
  - Naming convention (`^[a-z0-9-]{1,64}$`)
  - Description length ≤ 1024 chars
  - Required vs optional sections
  - Cross-skill dependency rules
- [ ] Expand `tests/agents/test_chat_skill_loader.py` to enforce spec compliance for all discovered skills (not just individual load tests)

### 2. `pydantic-ai-skills` spike criteria

Before any production dependency change, the spike must answer:

| Question | Pass Criteria |
|---|---|
| Does it load our 12 skills? | All skills discovered, frontmatter parsed correctly, body retrievable |
| Does it validate our format? | No false positives on valid skills; rejects malformed frontmatter |
| What tools does it expose? | Document `load_skill`, `read_skill_resource`, `run_skill_script`, etc. |
| Can script execution be disabled? | Must be able to disable `run_skill_script` or any arbitrary code execution |
| Can we keep `loadSkill` invisible? | Backend stream mapper can still sanitize output; or library supports hidden tools |
| What custom code could be deleted? | Quantify lines saved in `chat_skill_loader.py` and `chat_agent.py` |
| What risks remain? | Document any stream semantics gaps, security concerns, or maintenance burden |

Spike deliverable: `docs/plans/2026-05-03-pydantic-ai-skills-spike.md` (see separate doc).

### 3. Optional adoption decision criteria

Adopt `pydantic-ai-skills` only if ALL of the following are true:
- Spike passes all criteria above
- It reduces custom code by ≥ 30% (measured in lines) without adding abstraction layers we don't need
- It does not force script execution or resource loading we can't disable
- It does not break existing stream semantics (invisible `loadSkill`, retry suppression, `agent-status`)
- It has stable releases (not pre-release) and documented maintenance commitment

### 4. Evals later

- Add skill-loading evals once Pydantic AI Evals or comparable framework is integrated
- Measure: correct skill selected for query, correct skill loaded before output generation, no hallucinated skill claims

---

## Risks of Scripts / Resources / Assets in FastAPI / Bedrock

| Risk | Impact | Mitigation |
|---|---|---|
| **Script execution** | Arbitrary code execution in FastAPI worker context | Never enable `run_skill_script` unless sandboxed (e.g., Firecracker, gVisor). Default: disabled. |
| **Resource size** | Large `resources/` files inflate container image or memory | Keep resources in S3, load by reference. Do not embed binaries in skill folders. |
| **Asset path traversal** | Malicious skill folder could reference files outside skills dir | Validate all paths with `resolved.startswith(skills_dir)` — already done in our loader. |
| **Bedrock context window** | Eager-loading resources increases token usage | Maintain progressive disclosure: metadata only in prompt, resources loaded on demand. |
| **Third-party maintenance** | `pydantic-ai-skills` may lag behind Pydantic AI or AgentSkills spec changes | Pin version, fork if critical, keep custom loader as fallback. |

---

## What NOT to Do

- **Do NOT** add `pydantic-ai-skills` to `pyproject.toml` or production dependencies without explicit user approval after spike.
- **Do NOT** remove `loadSkill` tool or make skill bodies eager-loaded.
- **Do NOT** add `scripts/`, `resources/`, or `assets/` folders to skills without a security review and sandbox strategy.
- **Do NOT** refactor `chat_stream_protocol.py` stream mapper to use framework-native events unless the spike proves semantic parity.
- **Do NOT** fix PyPDF2 deprecation warnings or Pydantic alias warnings if it requires wide schema refactoring — document as pending instead.
- **Do NOT** build. No build step required for these changes.

---

## Pending Items

| Item | Reason | Tracking |
|---|---|---|
| PyPDF2 deprecation warnings | Requires touching multiple document processing modules; not isolated | Documented here; scheduled for next dependency upgrade cycle |
| Pydantic alias warnings | Requires schema-wide `populate_by_name` or model config changes | Documented here; scheduled for next Pydantic upgrade |
| `asyncio_default_fixture_loop_scope` deeper review | Simple config added; if tests fail, revisit fixture-scoped event loops | Added to `pyproject.toml`; monitor CI |

---

## Related Documents

- `docs/plans/2026-05-02-chat-agent-harness-modernization-plan.md`
- `docs/plans/2026-04-30-folder-per-skill-migration.md`
- `backend/app/agents/chat_skill_loader.py`
- `backend/app/agents/chat_agent.py`
- `backend/app/services/chat_stream_protocol.py`
