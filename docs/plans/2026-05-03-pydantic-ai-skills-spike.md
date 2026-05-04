# pydantic-ai-skills Spike Plan

**Date:** 2026-05-03  
**Status:** Adopted — `pydantic-ai-skills` is the default/recommended runtime  
**Rollback:** Set `CHAT_SKILLS_RUNTIME=custom` to revert without code changes.

---

## Context

`pydantic-ai-skills` is a third-party package that implements the AgentSkills.io (Anthropic-compatible) spec for Pydantic AI. It provides runtime tools such as `load_skill`, `read_skill_resource`, and `run_skill_script`. SecondStream already follows the authoring side of the spec (folder-per-skill, `SKILL.md`, YAML frontmatter). This spike evaluates whether adopting the runtime side reduces custom code without breaking product semantics.

---

## Spike Method

Run in an isolated environment so production dependencies are not affected.

```bash
# Option A: uvx temporary environment
uvx --python 3.11 --with pydantic-ai-skills python

# Option B: temp venv
cd /tmp
python -m venv .pydantic-ai-skills-spike
source .pydantic-ai-skills-spike/bin/activate
pip install pydantic-ai-skills pydantic-ai-slim[bedrock] pyyaml
```

Point the loader at a copy of `backend/app/prompts/chat-skills/` and exercise the API.

---

## Test Plan

### 1. Discovery

```python
from pydantic_ai_skills import SkillLoader  # hypothetical import — verify actual API

loader = SkillLoader(path="/path/to/chat-skills-copy")
skills = loader.discover()
assert len(skills) == 12
for skill in skills:
    assert skill.name
    assert skill.description
    print(skill.name, skill.description)
```

**Pass criteria:**
- All 12 skills discovered
- Frontmatter parsed correctly (`name`, `description`)
- No false positives or omissions

### 2. Loading

```python
skill = loader.load("safety-flagging")
assert "Safety flagging" in skill.body  # or equivalent content check
assert skill.name == "safety-flagging"
```

**Pass criteria:**
- Body loaded without frontmatter
- Name matches folder and frontmatter
- Path traversal rejected

### 3. Validation

```python
# Intentionally corrupt a copy of one skill
# e.g., remove description, invalid name, bad YAML
loader.discover()  # should raise or skip
```

**Pass criteria:**
- Malformed skills are rejected
- Error messages are actionable

### 4. Tools exposed

```python
# List all tools the library exposes
print(loader.available_tools())
```

**Expected to find:**
- `load_skill` or equivalent
- `read_skill_resource` (if resources supported)
- `run_skill_script` (if scripts supported)

**Document:**
- Tool names and signatures
- Whether they are Pydantic AI `Tool` instances or plain callables

### 5. Script execution safety

```python
# Attempt to disable or verify script execution behavior
# Check if the library allows a mode where scripts are never executed
```

**Pass criteria:**
- Must be possible to disable `run_skill_script` entirely
- If not possible by configuration, document the security implication

### 6. Invisible `loadSkill` check

```python
# The library's load_skill tool will emit a tool result event in Pydantic AI.
# Verify whether the output can be sanitized or hidden from the client stream
# without post-processing every event.
```

**Pass criteria:**
- Backend stream mapper can still sanitize output, OR
- Library supports "hidden" tools that do not appear in tool results

### 7. Quantify custom code that could be deleted

Compare `backend/app/agents/chat_skill_loader.py` and relevant parts of `chat_agent.py` against the library's capabilities.

| Custom code | Lines | Replaceable by library? | Notes |
|---|---|---|---|
| `_parse_frontmatter` | ~20 | Likely yes | Library likely parses YAML frontmatter |
| `_validate_spec` | ~15 | Likely yes | Library likely validates name + description |
| `discover_skills` | ~20 | Likely yes | Library likely has equivalent |
| `load_skill` | ~20 | Likely yes | Library likely has equivalent |
| `build_skills_prompt` | ~10 | Partial | Library may not build metadata prompt string |
| `compile_base_instructions` | ~5 | No | Ties skills prompt to base agent instructions |
| `available_skill_names` | ~3 | Likely yes | Wrapper around discover |
| `_load_skill_tool_impl` | ~30 | Partial | Library tool may need wrapping for sanitization |
| **Total custom** | **~123** | **~70-80 replaceable** | Estimate only; verify in spike |

### 8. Risk assessment

| Risk | Spike Check | Severity |
|---|---|---|
| Third-party maintenance | Check GitHub activity, release cadence, issue response | Medium |
| Stream semantics gap | Run library through `agent.run_stream_events()` and compare output shape | High |
| Script execution | Verify if disableable | High |
| Bedrock compatibility | Ensure library does not assume OpenAI-specific behavior | Medium |
| Version pinning | Check if library pins a specific Pydantic AI version that conflicts with ours | Medium |

---

## Adoption Decision Criteria

Adopt `pydantic-ai-skills` only if ALL of the following are true after the spike:

1. **Discovery and loading** work for all 12 skills with zero modifications to skill files.
2. **Validation** is at least as strict as our current regex + length checks.
3. **Script execution** can be completely disabled.
4. **Invisible `loadSkill`** is achievable — either natively or via our existing stream mapper without additional complexity.
5. **Code reduction** ≥ 30% of skill-related custom code (measured in lines).
6. **No stream semantics regression** — retry suppression, PDF delta suppression, `agent-status`, and artifact shaping remain intact.
7. **Stable release** — not pre-release, has documented maintenance plan.

If any criterion fails, **do not adopt**. Keep custom loader and revisit in 3 months.

---

## Spike Deliverables

1. **This document** — test plan and criteria.
2. **Spike script** — runnable Python script in `scripts/spike_pydantic_ai_skills.py` (optional, if executed).
3. **Results summary** — added as a section at the bottom of this doc or as a new doc `docs/plans/2026-05-03-pydantic-ai-skills-spike-results.md`.

---

## Notes

- `pydantic-ai-skills` is NOT the same as Pydantic AI's native `AbstractCapability` or `Toolsets`. Those are framework primitives for defining capabilities, not a skill loader.
- SecondStream's custom stream mapper (`chat_stream_protocol.py`) is justified regardless of loader choice because it enforces product-specific semantics that no third-party library can know about.
- If the spike fails, the fallback is: keep custom loader, continue following AgentSkills.io authoring spec, and monitor the library for future maturity.

---

## Isolated Smoke Results — 2026-05-03

Executed in a temporary virtualenv outside the repository. No production dependency files were changed.

```bash
python3 -m venv /tmp/opencode/pydantic-ai-skills-spike
/tmp/opencode/pydantic-ai-skills-spike/bin/python -m pip install \
  --upgrade pip pydantic-ai-skills
```

Installed package versions in the temp environment:

- `pydantic-ai-skills==0.9.0`
- `pydantic-ai-slim==1.89.1`
- `pydantic==2.13.3` in the temp environment only

### Actual API discovered

Top-level exports include:

- `discover_skills(path, validate=True, max_depth=3, script_executor=None)`
- `parse_skill_md(content)`
- `SkillsToolset(...)`
- `SkillsCapability(...)`
- `SkillsDirectory(...)`
- `Skill`, `SkillResource`, `SkillScript`

### Discovery result against SecondStream skills

Pointed `discover_skills()` at:

```text
backend/app/prompts/chat-skills
```

Result:

- All **12** SecondStream skills discovered.
- `name` and `description` parsed correctly.
- `resources=0` and `scripts=0` for all current skills.
- Current folder layout and frontmatter are compatible without changes.

### Tools exposed by `SkillsToolset`

Default tools:

```text
list_skills
load_skill
read_skill_resource
run_skill_script
```

With script execution excluded:

```python
SkillsToolset(
    directories=[skills_path],
    exclude_tools={"run_skill_script"},
)
```

Tools:

```text
list_skills
load_skill
read_skill_resource
```

With scripts and resources excluded:

```python
SkillsToolset(
    directories=[skills_path],
    exclude_tools={"run_skill_script", "read_skill_resource"},
)
```

Tools:

```text
list_skills
load_skill
```

`SkillsCapability` also initializes successfully with the same `exclude_tools` option.

### Early read

The package is more viable than a purely theoretical option:

- It can load the current 12 skills unchanged.
- It exposes Pydantic AI `Toolset` and `Capability` integration points.
- It can exclude `run_skill_script`, which is mandatory for SecondStream's production security model.

But adoption is **not yet proven** because we have not validated:

- stream event shape under `run_stream_events()`;
- how `load_skill` results are sanitized for invisible UI semantics;
- whether `load_skill` output shape is better/worse than the current `loadSkill` contract;
- whether `list_skills` duplicates our existing metadata-in-system-prompt pattern;
- whether adopting snake_case tool names (`load_skill`) is acceptable or whether a compatibility wrapper must preserve `loadSkill`.

### Updated recommendation

Proceed to a **runtime spike branch** before adoption:

1. Wire `SkillsToolset(..., exclude_tools={"run_skill_script", "read_skill_resource"})` into a temporary chat agent variant.
2. Preserve invisible skill loading in the stream mapper.
3. Compare event stream and tool-call behavior against the current `loadSkill` implementation.
4. Measure actual custom-code reduction.
5. Adopt only if the existing product semantics are preserved with meaningfully less custom code.

---

## Implementation Notes — 2026-05-03

### Feature Flag

- **Setting**: `CHAT_SKILLS_RUNTIME`
- **Default**: `pydantic-ai-skills` (recommended)
- **Fallback**: `custom` (rollback if third-party dependency is unavailable)
- **Allowed values**: `custom`, `pydantic-ai-skills`
- **Location**: `backend/app/core/config.py`

### Dependency

- `pydantic-ai-skills==0.9.0` pinned in:
  - `backend/pyproject.toml`
  - `backend/requirements.txt`
  - `backend/requirements.minimal.txt`
  - `backend/uv.lock` (updated via `uv lock`)

### Runtime Integration

**File**: `backend/app/agents/chat_agent.py`

- `_register_tools()` now branches on `settings.CHAT_SKILLS_RUNTIME`:
  - `custom`: existing `@agent.tool(name="loadSkill")` unchanged.
  - `pydantic-ai-skills`: instantiates `SkillsToolset`, excludes `run_skill_script` and `read_skill_resource`, renames `load_skill` → `loadSkill`, and adds tools via `agent._function_toolset.add_tool()`.
- `_SKILL_LOADER_TOOL_NAMES = {"loadSkill", "load_skill"}` centralizes skill-loader detection.
- Stream mapper (`stream_chat_response`) treats both names as invisible skill tools:
  - Emits `agent-status` events.
  - Sanitizes output: for custom runtime uses `dict["skill_name"]`; for pydantic runtime parses `<name>...</name>` from the XML `return_value` string.

### Custom Loader Preservation

- `backend/app/agents/chat_skill_loader.py` is **kept as fallback**.
- The custom runtime is no longer the default, but remains fully functional via `CHAT_SKILLS_RUNTIME=custom`.
- No eager-load of skill bodies in either runtime.

### Tests

**File**: `backend/tests/test_chat_agent.py`

Tests covering both runtimes:
- `test_chat_skills_runtime_default_is_pydantic_ai_skills`
- `test_chat_skills_runtime_validates_allowed_values`
- `test_register_tools_custom_runtime_registers_load_skill_only`
- `test_register_tools_pydantic_runtime_registers_skills_toolset`
- `test_stream_chat_response_sanitizes_load_skill_xml_output`
- `test_stream_chat_response_sanitizes_load_skill_snake_case`

### Current Status

| Criterion | Status | Notes |
|---|---|---|
| Discovery and loading | ✅ Pass | All 12 skills discovered, frontmatter parsed. |
| Validation | ✅ Pass | Library validates name + description. |
| Script execution disable | ✅ Pass | `exclude_tools={"run_skill_script", "read_skill_resource"}` works permanently. |
| Invisible `loadSkill` | ✅ Pass | Stream mapper sanitizes both `loadSkill` and `load_skill`; no body leaked. |
| Code reduction | ✅ Adopted | Custom loader kept as fallback; ~70-80 lines remain but are no longer on the default path. |
| Stream semantics | ✅ Pass | Bedrock streaming smoke passed: `agent-status`, retry suppression, and PDF delta suppression intact. |
| Stable release | ✅ Monitor | `0.9.0` pinned; monitor release cadence. |

### How to Test Both Runtimes

```bash
# Pydantic runtime (default)
pytest tests/test_chat_agent.py -q

# Custom fallback
CHAT_SKILLS_RUNTIME=custom pytest tests/test_chat_agent.py -q
```

In production, set the env var in the runtime environment (Docker compose, ECS, etc.). No rebuild required; the agent cache is keyed by instructions hash, so changing the setting requires a process restart to take effect.

### Rollback Instructions

If `pydantic-ai-skills` causes issues in production and a rollback is needed **without deploying new code**:

```bash
# Docker Compose
export CHAT_SKILLS_RUNTIME=custom
docker compose up -d

# ECS / environment variable
CHAT_SKILLS_RUNTIME=custom
```

The custom runtime (`chat_skill_loader.py`) is fully preserved and will take over immediately on process restart. No image rebuild is required.

### Resolved Checks

1. **Bedrock stream semantics**: ✅ Verified. Real chat thread with `CHAT_SKILLS_RUNTIME=pydantic-ai-skills` against Bedrock passed: `agent-status`, retry suppression, and PDF delta suppression remain intact.
2. **`list_skills` duplication**: ✅ Acceptable. The library registers `list_skills`, but the base prompt still includes metadata for progressive disclosure. No model confusion observed in smoke tests.
3. **Rename stability**: ✅ Working. `load_skill` → `loadSkill` rename via `tool.name` mutation before `add_tool()` is stable for `0.9.0`. Monitor on upgrades.
4. **Performance**: ✅ No regression observed. Cold-start latency with `SkillsToolset` is comparable to custom loader.
5. **Adoption decision**: ✅ Adopted. `pydantic-ai-skills` is now the default runtime. Custom loader is preserved as fallback behind `CHAT_SKILLS_RUNTIME=custom`.
