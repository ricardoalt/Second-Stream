"""Skill loader for chat agent — progressive disclosure via metadata + loadSkill tool."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import structlog

logger = structlog.get_logger(__name__)

_SKILLS_DIR = Path(__file__).parent.parent / "prompts" / "chat-skills"
_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

_SAFE_SKILL_NAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")
_SKILL_FILE_NAME = "SKILL.md"


@dataclass(slots=True, frozen=True)
class SkillMetadata:
    name: str
    description: str
    path: str


@dataclass(slots=True, frozen=True)
class SkillPrompt:
    name: str
    body: str  # frontmatter stripped


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Parse YAML frontmatter block, return (meta_dict, body).

    Handles simple key: "value" single-line frontmatter. Multi-line values
    are not supported; all skill files currently use single-line quoted strings.
    """
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_text = parts[1].strip()
    body = parts[2].strip()

    meta: dict[str, str] = {}
    for line in fm_text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            meta[key] = value
    return meta, body


def load_skill(name: str) -> SkillPrompt:
    """Load a skill from disk, stripping frontmatter.

    Validates the skill name to prevent path traversal outside the skills directory.
    """
    if not _SAFE_SKILL_NAME_RE.match(name):
        raise ValueError(f"Invalid skill name: {name}")
    path = _SKILLS_DIR / name / _SKILL_FILE_NAME
    resolved = path.resolve()
    if not str(resolved).startswith(str(_SKILLS_DIR.resolve())):
        raise ValueError(f"Skill path traversal attempt: {name}")
    if not path.exists():
        raise ValueError(f"Skill not found: {name}")

    raw = path.read_text(encoding="utf-8").strip()
    _, body = _parse_frontmatter(raw)
    return SkillPrompt(name=name, body=body)


def discover_skills() -> list[SkillMetadata]:
    """Discover standard folder-per-skill Agent Skills from SKILL.md frontmatter."""
    skills: list[SkillMetadata] = []
    if not _SKILLS_DIR.exists():
        logger.warning("chat_skills_directory_not_found", path=str(_SKILLS_DIR))
        return skills

    for file_path in sorted(_SKILLS_DIR.glob(f"*/{_SKILL_FILE_NAME}")):
        raw = file_path.read_text(encoding="utf-8").strip()
        meta, _ = _parse_frontmatter(raw)
        name = meta.get("name") or file_path.parent.name
        description = meta.get("description") or ""
        skills.append(
            SkillMetadata(
                name=name,
                description=description,
                path=str(file_path.relative_to(Path(__file__).parent.parent.parent)),
            )
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
