"""Generic WeasyPrint + Jinja2 renderer for SecondStream PDF documents.

CSS is loaded via <link> tags in _base.html.j2, so no stylesheets need to be
passed here. Each document type has a thin named wrapper below.
"""

from __future__ import annotations

import time
from io import BytesIO
from pathlib import Path

import structlog
from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel

logger = structlog.get_logger(__name__)

_TEMPLATE_DIR = Path(__file__).parent.parent / "prompts" / "pdf"


def render_pdf(template_name: str, payload: BaseModel) -> BytesIO:
    """Render a PDF from a Jinja2 template and a Pydantic payload.

    template_name: filename relative to the pdf/ template directory.
    payload:       exposed to the template as the ``payload`` variable.
    """
    from weasyprint import HTML

    t0 = time.monotonic()
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=True,
    )
    html_content = env.get_template(template_name).render(payload=payload)
    buf = BytesIO()
    HTML(string=html_content, base_url=str(_TEMPLATE_DIR)).write_pdf(buf)
    buf.seek(0)
    duration_ms = round((time.monotonic() - t0) * 1000)
    logger.info(
        "pdf_rendered",
        template=template_name,
        duration_ms=duration_ms,
        size_bytes=len(buf.getvalue()),
    )
    return buf


# ── Document wrappers ─────────────────────────────────────────────────────── #


def render_discovery_report(payload: BaseModel) -> BytesIO:
    return render_pdf("discovery_executive.html.j2", payload)


def render_ideation_brief(payload: BaseModel) -> BytesIO:
    return render_pdf("ideation_brief.html.j2", payload)


def render_analytical_read(payload: BaseModel) -> BytesIO:
    return render_pdf("analytical_read.html.j2", payload)


def render_playbook(payload: BaseModel) -> BytesIO:
    return render_pdf("playbook.html.j2", payload)
