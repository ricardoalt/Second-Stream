"""WeasyPrint-based renderer for SecondStream Executive Discovery Reports."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.agents.discovery_report_schema import DiscoveryReportPayload

_TEMPLATE_DIR = Path(__file__).parent.parent / "prompts" / "pdf"


def render_discovery_report(payload: DiscoveryReportPayload) -> BytesIO:
    """Render an Executive Discovery Report PDF from a structured payload."""
    from weasyprint import CSS, HTML
    from weasyprint.text.fonts import FontConfiguration

    env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)
    template = env.get_template("discovery_executive.html.j2")
    html_content = template.render(payload=payload)

    css_path = _TEMPLATE_DIR / "discovery_executive.css"
    font_config = FontConfiguration()

    buf = BytesIO()
    HTML(string=html_content, base_url=str(_TEMPLATE_DIR)).write_pdf(
        buf,
        stylesheets=[CSS(filename=str(css_path), font_config=font_config)],
        font_config=font_config,
    )
    buf.seek(0)
    return buf
