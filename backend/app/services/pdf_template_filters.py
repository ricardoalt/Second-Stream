from __future__ import annotations

import re
from collections.abc import Callable

from jinja2 import Environment
from markupsafe import Markup, escape

_LEADING_NUMBER_RE = re.compile(r"^\s*(?:\d+[.)]\s+)+")
_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

_EMOJI_MARKER_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"🔴\s*(?:red flag|risk|caution|warning)?\s*:?\s*", re.IGNORECASE),
        '<span class="marker-caution">■</span> <strong>Caution:</strong> ',
    ),
    (
        re.compile(r"⚠️?\s*(?:warning|caution|risk)?\s*:?\s*", re.IGNORECASE),
        '<span class="marker-caution">■</span> <strong>Caution:</strong> ',
    ),
    (
        re.compile(r"❌\s*(?:gap|blocker|missing|not fit)?\s*:?\s*", re.IGNORECASE),
        '<span class="marker-gap">■</span> <strong>Gap:</strong> ',
    ),
    (
        re.compile(r"💡\s*(?:insight|idea)?\s*:?\s*", re.IGNORECASE),
        '<span class="marker-insight">■</span> <strong>Insight:</strong> ',
    ),
    (
        re.compile(r"👉\s*(?:implication|next step|watch)?\s*:?\s*", re.IGNORECASE),
        '<span class="marker-insight">■</span> <strong>Implication:</strong> ',
    ),
    (
        re.compile(r"✅\s*(?:recommended|recommendation|done|fit)?\s*:?\s*", re.IGNORECASE),
        '<span class="marker-insight">■</span> <strong>Recommended:</strong> ',
    ),
)


def section_heading(title: str, number: int) -> str:
    """Return one canonical numeric prefix for a section heading."""
    clean_title = _LEADING_NUMBER_RE.sub("", title).strip()
    return f"{number}. {clean_title}"


def professionalize_markers(text: str | None) -> Markup:
    """Convert common LLM emoji bullets into SecondStream PDF markers."""
    if not text:
        return Markup("")

    safe_text = str(escape(text))
    for pattern, replacement in _EMOJI_MARKER_REPLACEMENTS:
        safe_text = pattern.sub(replacement, safe_text)
    return Markup(safe_text)


def alpha_label(index: int) -> str:
    """Return spreadsheet-style alphabetic labels for 1-based indexes."""
    if index < 1:
        return ""

    label = ""
    while index:
        index, remainder = divmod(index - 1, len(_ALPHABET))
        label = _ALPHABET[remainder] + label
    return label


def join_gate_blockers(blockers: list[str] | None) -> Markup:
    """Join gate blockers as escaped line-separated HTML."""
    if not blockers:
        return Markup("")

    return Markup("<br>").join(professionalize_markers(blocker) for blocker in blockers)


def configure_pdf_environment(env: Environment) -> Environment:
    """Register shared filters used by PDF templates."""
    filters: dict[str, Callable[..., object]] = {
        "section_heading": section_heading,
        "professionalize_markers": professionalize_markers,
        "alpha_label": alpha_label,
        "join_gate_blockers": join_gate_blockers,
    }
    env.filters.update(filters)
    return env
