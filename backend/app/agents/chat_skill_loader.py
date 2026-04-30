"""Skill loader for chat agent — compiles always-on + conditional instructions."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from app.services.chat_stream_protocol import ChatAgentAttachmentInput

logger = structlog.get_logger(__name__)

_SKILLS_DIR = Path(__file__).parent.parent / "prompts" / "chat-skills"
_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

_ALWAYS_ON = [
    "safety-flagging",
    "qualification-gate",
    "sub-discipline-router",
    "specialist-lens-light",
    "commercial-shaping",
    "discovery-gap-analysis",
    "discovery-reporting",
    "ideation-brief",
    "analytical-read",
    "playbook",
]

_SDS_FILENAME_PATTERNS = re.compile(
    r"(sds|safety.data.sheet|material.safety|msds|tds)", re.IGNORECASE
)


@dataclass(slots=True, frozen=True)
class SkillPrompt:
    name: str
    body: str  # frontmatter stripped


def _strip_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Remove YAML frontmatter block, return (meta_lines_dict, body)."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    return {}, parts[2].strip()


def load_skill(name: str) -> SkillPrompt:
    """Load a skill from disk, stripping frontmatter."""
    path = _SKILLS_DIR / f"{name}.md"
    raw = path.read_text(encoding="utf-8").strip()
    _, body = _strip_frontmatter(raw)
    return SkillPrompt(name=name, body=body)


def compile_base_instructions() -> str:
    """Compile base agent prompt + always-on skills into a single instructions string."""
    base_prompt = (_PROMPTS_DIR / "chat-agent-prompt.md").read_text(encoding="utf-8").strip()

    skill_blocks: list[str] = []
    for skill_name in _ALWAYS_ON:
        skill = load_skill(skill_name)
        skill_blocks.append(f"## Skill: {skill_name}\n\n{skill.body}")

    skills_block = "\n\n---\n\n".join(skill_blocks)
    return f"{base_prompt}\n\n---\n\n# Active Skills\n\n{skills_block}"


def _is_sds_attachment(att: ChatAgentAttachmentInput) -> bool:
    filename = (getattr(att, "filename", "") or "").lower()
    media_type = (getattr(att, "media_type", "") or "").lower()
    return bool(_SDS_FILENAME_PATTERNS.search(filename)) or "safety-data-sheet" in media_type


def _resolve_conditional_skills(ctx) -> list[str]:
    """Return conditional skill names active for the given context."""
    attachments = getattr(getattr(ctx, "deps", None), "attachments", ()) or ()
    skills: list[str] = []

    has_non_text = any(
        not (getattr(att, "media_type", "") or "").startswith("text/") for att in attachments
    )
    if has_non_text:
        skills.append("multimodal-intake")

    has_sds = any(_is_sds_attachment(att) for att in attachments)
    if has_sds:
        skills.append("sds-interpretation")

    return skills


def build_conditional_instructions_fn():
    """Return a function RunContext -> str that appends conditional skill instructions."""

    def _fn(ctx) -> str:
        blocks: list[str] = []
        for skill_name in _resolve_conditional_skills(ctx):
            skill = load_skill(skill_name)
            blocks.append(f"## Skill: {skill_name}\n\n{skill.body}")

        return "\n\n---\n\n".join(blocks)

    return _fn


def resolve_active_skills(ctx) -> list[str]:
    """Return all active skill names (always-on + conditional) for a given context."""
    return list(_ALWAYS_ON) + _resolve_conditional_skills(ctx)
