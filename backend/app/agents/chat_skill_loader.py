"""Skill loader for chat agent — progressive disclosure via metadata + loadSkill tool.

Frontmatter is parsed as standard YAML and validated against the Anthropic Agent
Skills spec: `name` matches `^[a-z0-9-]{1,64}$`, `description` is non-empty and
≤ 1024 characters. Validation is fail-fast at discovery time so a malformed
skill surfaces as a startup error rather than a silent runtime omission.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import structlog
import yaml

logger = structlog.get_logger(__name__)

_SKILLS_DIR = Path(__file__).parent.parent / "prompts" / "chat-skills"
_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Anthropic Agent Skills spec: lowercase, digits, hyphens only, 1-64 chars.
_SPEC_NAME_RE = re.compile(r"^[a-z0-9-]{1,64}$")
_SPEC_DESCRIPTION_MAX = 1024
_SKILL_FILE_NAME = "SKILL.md"


class SkillSpecError(ValueError):
    """Raised when a skill's frontmatter does not match the Agent Skills spec."""


@dataclass(slots=True, frozen=True)
class SkillMetadata:
    name: str
    description: str
    path: str


@dataclass(slots=True, frozen=True)
class SkillPrompt:
    name: str
    body: str  # frontmatter stripped


def _parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    """Parse YAML frontmatter block, return (meta_dict, body).

    Uses `yaml.safe_load` so multi-line values, escapes, and quoted strings are
    handled per the YAML 1.1 spec. Returns ({}, text) when no frontmatter is
    present.
    """
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_text = parts[1]
    body = parts[2].strip()

    loaded = yaml.safe_load(fm_text) or {}
    if not isinstance(loaded, dict):
        raise SkillSpecError(
            f"Frontmatter must be a YAML mapping, got {type(loaded).__name__}"
        )
    return loaded, body


def _validate_spec(name: str, description: str, source: str) -> None:
    """Validate frontmatter against the Anthropic Agent Skills spec.

    `source` is the file path used for error messages.
    """
    if not isinstance(name, str) or not _SPEC_NAME_RE.match(name):
        raise SkillSpecError(
            f"{source}: name must match ^[a-z0-9-]{{1,64}}$, got {name!r}"
        )
    if not isinstance(description, str) or not description.strip():
        raise SkillSpecError(f"{source}: description is required and non-empty")
    if len(description) > _SPEC_DESCRIPTION_MAX:
        raise SkillSpecError(
            f"{source}: description is {len(description)} chars, "
            f"spec max is {_SPEC_DESCRIPTION_MAX}"
        )


def load_skill(name: str) -> SkillPrompt:
    """Load a skill from disk, stripping frontmatter.

    Validates the skill name against the spec regex, which also prevents path
    traversal outside the skills directory.
    """
    if not _SPEC_NAME_RE.match(name):
        raise SkillSpecError(f"Invalid skill name: {name!r}")
    path = _SKILLS_DIR / name / _SKILL_FILE_NAME
    resolved = path.resolve()
    if not str(resolved).startswith(str(_SKILLS_DIR.resolve())):
        raise SkillSpecError(f"Skill path traversal attempt: {name}")
    if not path.exists():
        raise SkillSpecError(f"Skill not found: {name}")

    raw = path.read_text(encoding="utf-8").strip()
    _, body = _parse_frontmatter(raw)
    return SkillPrompt(name=name, body=body)


def discover_skills() -> list[SkillMetadata]:
    """Discover folder-per-skill Agent Skills from SKILL.md frontmatter.

    Fails fast if any discovered skill violates the spec.
    """
    skills: list[SkillMetadata] = []
    if not _SKILLS_DIR.exists():
        logger.warning("chat_skills_directory_not_found", path=str(_SKILLS_DIR))
        return skills

    for file_path in sorted(_SKILLS_DIR.glob(f"*/{_SKILL_FILE_NAME}")):
        raw = file_path.read_text(encoding="utf-8").strip()
        meta, _ = _parse_frontmatter(raw)
        name = meta.get("name") or file_path.parent.name
        description = meta.get("description") or ""
        rel_path = str(file_path.relative_to(Path(__file__).parent.parent.parent))
        _validate_spec(name=name, description=description, source=rel_path)
        skills.append(
            SkillMetadata(name=name, description=description, path=rel_path)
        )
    return skills


def build_skills_prompt() -> str:
    """Return a compact metadata-only prompt of all available skills."""
    skills = discover_skills()
    if not skills:
        return "## Available Skills\n\n(no skills discovered)"

    lines = ["## Available Skills\n"]
    lines.extend(f"- **{skill.name}**: {skill.description}" for skill in skills)

    return "\n".join(lines)


_SKILLS_USAGE_GUIDANCE = """\
# Skill Loading

You have access to the skills listed below. Only metadata is shown initially.
Before performing specialized work, identify the full set of relevant skills from the metadata and call `loadSkill` for that set before applying their instructions.
Skill loading is read-only and independent. When multiple skills are relevant, request all of those `loadSkill` calls in the same model step; do not wait for one skill to load before requesting the next.
Do not narrate skill loading to the user. Load skills silently before writing user-facing analysis. If unsure which skills apply, load the most likely set and proceed rather than delaying for perfect selection.

- For report generation, load `discovery-reporting` and all relevant artefact skills (`ideation-brief`, `analytical-read`, `playbook`) together before beginning PDF generation.
- For commercial positioning, load `commercial-shaping`.
- For technical documents such as SDS, COA, lab analysis, TCLP/SPLP, waste profile, composition reports, load `sds-interpretation`.
- For images/audio/video/PDF visual documents, load `multimodal-intake` when relevant.

Do not claim a skill is applied unless you have loaded it with `loadSkill` in this run.
"""


def compile_base_instructions() -> str:
    """Compile base agent prompt + available skills metadata into a single instructions string."""
    base_prompt = (_PROMPTS_DIR / "chat-agent-prompt.md").read_text(encoding="utf-8").strip()
    skills_prompt = build_skills_prompt()
    return f"{base_prompt}\n\n---\n\n{_SKILLS_USAGE_GUIDANCE}\n\n{skills_prompt}"


def available_skill_names() -> list[str]:
    """Return names of all discovered skills."""
    return [s.name for s in discover_skills()]
