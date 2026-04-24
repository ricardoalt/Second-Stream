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
]

_SDS_FILENAME_PATTERNS = re.compile(
    r"(sds|safety.data.sheet|material.safety|msds|tds)", re.IGNORECASE
)


@dataclass(slots=True, frozen=True)
class SkillPrompt:
    name: str
    body: str  # frontmatter stripped, harness directives sanitized


def _strip_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Remove YAML frontmatter block, return (meta_lines_dict, body)."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    return {}, parts[2].strip()


def _sanitize_discovery_reporting(body: str) -> str:
    """Replace Claude harness directives with WeasyPrint/tool equivalents."""
    # Remove save-to-disk instruction block
    body = re.sub(r"Save to `/mnt/user-data/outputs/`.*?```", "", body, flags=re.DOTALL)
    # Remove present_files call instruction lines (all occurrences)
    body = re.sub(r"[^\n]*`?present_files`?[^\n]*\n?", "", body)
    # Replace reportlab references with WeasyPrint tool reference
    body = body.replace("reportlab", "WeasyPrint (via tool `generateDiscoveryReport`)")
    # Remove raw Python reportlab syntax examples
    body = re.sub(r"```python\nParagraph.*?```", "", body, flags=re.DOTALL)
    # Add tool instruction at the end
    replacement = (
        "\n\nTo produce the PDF, call the tool `generateDiscoveryReport` with the "
        "structured payload. The tool renders the PDF and returns a signed download URL. "
        "Do NOT use Unicode subscript/superscript characters — use HTML entities instead: "
        "H&lt;sub&gt;2&lt;/sub&gt;S, not H₂S.\n"
    )
    body = body + replacement
    return body.strip()


def load_skill(name: str) -> SkillPrompt:
    """Load a skill from disk, stripping frontmatter and sanitizing harness refs."""
    path = _SKILLS_DIR / f"{name}.md"
    raw = path.read_text(encoding="utf-8").strip()
    _, body = _strip_frontmatter(raw)

    if name == "discovery-reporting":
        body = _sanitize_discovery_reporting(body)

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


def build_conditional_instructions_fn():
    """Return a function RunContext -> str that appends conditional skill instructions."""

    def _fn(ctx) -> str:
        attachments = getattr(getattr(ctx, "deps", None), "attachments", ()) or ()
        blocks: list[str] = []

        has_non_text = any(
            not (getattr(att, "media_type", "") or "").startswith("text/")
            for att in attachments
        )
        if has_non_text:
            skill = load_skill("multimodal-intake")
            blocks.append(f"## Skill: multimodal-intake\n\n{skill.body}")

        has_sds = any(_is_sds_attachment(att) for att in attachments)
        if has_sds:
            skill = load_skill("sds-interpretation")
            blocks.append(f"## Skill: sds-interpretation\n\n{skill.body}")

        return "\n\n---\n\n".join(blocks)

    return _fn
