"""Tests for the generic pdf_renderer and the three new document types.

WeasyPrint requires system C libraries (Cairo, Pango, libgobject).
Tests are skipped when those are not present (dev machine without brew deps).
Run these in Docker via `make test-file FILE=tests/services/test_pdf_renderers.py`.
"""

from pathlib import Path

import pytest
from jinja2 import Environment, FileSystemLoader

weasyprint_available = True
try:
    import weasyprint  # noqa: F401
except (OSError, ImportError):
    weasyprint_available = False

requires_weasyprint = pytest.mark.skipif(
    not weasyprint_available,
    reason="WeasyPrint system libraries (libgobject, Cairo, Pango) not installed",
)

from app.agents.analytical_read_schema import (
    AnalyticalReadPayload,
    AnalyticalSection,
    AnalyticalTable,
    Cell,
    EvidenceTag,
    GapItem,
    GapSection,
)
from app.agents.ideation_brief_schema import (
    IdeationBriefPayload,
    IdeationSection,
    IdeationSubSection,
)
from app.agents.playbook_schema import PlaybookPayload, PlaybookTheme
from app.agents.shared_schema import SafetyFlag
from app.services.pdf_template_filters import configure_pdf_environment


def _row(*values: str) -> list[Cell]:
    """Concise helper to build a row of normal cells in tests."""
    return [Cell(value=v) for v in values]


PDF_TEMPLATE_DIR = Path(__file__).resolve().parents[2] / "app" / "prompts" / "pdf"

# ── Payload factories ──────────────────────────────────────────────────── #


def _ideation_payload(**overrides) -> IdeationBriefPayload:
    defaults: dict = {
        "customer": "ExxonMobil",
        "stream": "Spent Sulfidic Caustic",
        "date": "2026-04-25",
        "header_line": "ExxonMobil — Spent Sulfidic Caustic Portfolio · 4 sites in scope",
        "gate_status": "OPEN",
        "gate_blocker": None,
        "sections": [
            IdeationSection(
                title="Volume & Continuity",
                lead="Four sites, four different streams.",
                body="The opportunity requires segregation strategy.",
                emphasis="insight",
            ),
            IdeationSection(
                title="Safety Profile",
                lead="H2S risk present across all sites.",
                body="PPE and manifold handling protocols required.",
                emphasis="caution",
            ),
        ],
        "strategic_insight": "This is not one stream — it is four. Win if you segregate.",
        "markers_used": ["insight", "caution"],
    }
    defaults.update(overrides)
    return IdeationBriefPayload(**defaults)


def _analytical_payload(**overrides) -> AnalyticalReadPayload:
    defaults: dict = {
        "customer": "Chevron",
        "stream": "Spent Caustic — Gulf Coast",
        "date": "2026-04-25",
        "header_line": "Chevron — Gulf Coast Spent Caustic Portfolio · Baytown + Beaumont + Corpus Christi",
        "gate_status": "OPEN_CONDITIONAL",
        "gate_blockers": ["Per-site volume split not stated", "Phenol result pending"],
        "executive_summary": "Three streams with distinct H2S profiles across two facilities.",
        "safety_callouts": [
            SafetyFlag(
                severity="attention",
                sub_stream="Site A",
                description="H2S above 50 ppm",
                intervention="Pre-treatment required",
            ),
        ],
        "tables": [
            AnalyticalTable(
                title="1. Per-site chemistry read",
                headers=["Parameter", "Baytown", "Beaumont", "Corpus Christi"],
                rows=[
                    _row("pH", "13.13", "13.7", "13.9"),
                    [
                        Cell(value="Sulfide as S"),
                        Cell(value="0.74"),
                        Cell(value="0.13"),
                        Cell(value="3.35", emphasis="outlier"),
                    ],
                ],
            ),
            AnalyticalTable(
                title="2. Treatment fit by site",
                headers=["Route", "Baytown", "Beaumont", "Corpus Christi"],
                rows=[_row("Industrial alkaline reuse", "Strong fit", "Unlikely", "Strong fit*")],
            ),
            AnalyticalTable(
                title="3. Buyer archetype matrix",
                headers=["Buyer archetype", "Baytown", "Beaumont", "Key requirements"],
                rows=[
                    _row("Industrial alkaline user", "Fit", "Borderline", "Na >3%, Cl <100 mg/kg")
                ],
            ),
            AnalyticalTable(
                title="5. Sizing",
                headers=["Input", "Value", "Confidence", "Source"],
                rows=[_row("Mass rate", "~3,400 MT/month (~40,800 MT/yr)", "MEDIUM", "Calculated")],
            ),
        ],
        "evidence_tags": [
            EvidenceTag(
                tag="EV-01",
                title="Baytown COA",
                description="Most recent and granular COA.",
                confidence="HIGH",
            )
        ],
        "narrative_sections": [
            AnalyticalSection(
                title="4. Phased commercial scenarios",
                body="Phase 1 — Portfolio disposal + partial reuse qualification.",
                bullets=["Portfolio control improves pricing leverage."],
            )
        ],
        "gap_sections": [
            GapSection(
                title="Required",
                items=[
                    GapItem(
                        label="Per-site volume split",
                        detail="Blocks routing and commercial scenario selection.",
                    )
                ],
            ),
            GapSection(
                title="Nice to have",
                items=[GapItem(label="Fresh COA", detail="Improves routing confidence.")],
            ),
            GapSection(
                title="Regulatory flags",
                items=[
                    GapItem(
                        label="RCRA corrosivity", detail="Assessment must determine waste status."
                    )
                ],
            ),
        ],
        "strategic_insight": "Caustic C is gate-ready. A and B need pre-treatment first.",
    }
    defaults.update(overrides)
    return AnalyticalReadPayload(**defaults)


def _playbook_payload(**overrides) -> PlaybookPayload:
    defaults: dict = {
        "customer": "BP",
        "stream": "Refinery Waste",
        "date": "2026-04-25",
        "header_line": "BP — Refinery Waste · Greenfield opportunity (sites TBD)",
        "opening_context": "Greenfield opportunity — first meeting. Focus on volume validation.",
        "orientation_note": "The killer questions are in Theme 11. The questions you need to ask first are in Theme 1.",
        "themes": [
            PlaybookTheme(
                number=1,
                title="Volume & Continuity",
                body="Understand the generation rate and how stable it is across quarters.",
                probe_questions=[
                    "How is the monthly volume distributed across sites? — Ballpark is fine.",
                    "Has the rate been consistent over the past 12 months?",
                ],
                why_it_matters=[
                    "Volume dictates routing economics.",
                    "Variability above 20% changes the deal structure.",
                ],
            ),
            PlaybookTheme(
                number=11,
                title="Smart Questions — The High-Impact Set",
                body="The five questions that will most change your understanding of this deal.",
                probe_questions=["Can you give me a rough volume split across the sites?"],
            ),
        ],
    }
    defaults.update(overrides)
    return PlaybookPayload(**defaults)


def _render_html(template_name: str, payload: object) -> str:
    env = configure_pdf_environment(
        Environment(loader=FileSystemLoader(PDF_TEMPLATE_DIR), autoescape=True)
    )
    return env.get_template(template_name).render(payload=payload)


# ── Tests ──────────────────────────────────────────────────────────────── #


@requires_weasyprint
def test_ideation_brief_renders_pdf():
    from app.services.pdf_renderer import render_ideation_brief

    buf = render_ideation_brief(_ideation_payload())
    data = buf.read()
    assert data[:4] == b"%PDF"
    assert len(data) > 1024


@requires_weasyprint
def test_ideation_brief_conditionally_open_gate():
    from app.services.pdf_renderer import render_ideation_brief

    payload = _ideation_payload(gate_status="OPEN_CONDITIONAL", gate_blocker="Volume unconfirmed")
    buf = render_ideation_brief(payload)
    assert len(buf.read()) > 1024


@requires_weasyprint
def test_analytical_read_renders_pdf():
    from app.services.pdf_renderer import render_analytical_read

    buf = render_analytical_read(_analytical_payload())
    data = buf.read()
    assert data[:4] == b"%PDF"
    assert len(data) > 1024


@requires_weasyprint
def test_analytical_read_no_safety_callouts():
    from app.services.pdf_renderer import render_analytical_read

    payload = _analytical_payload(safety_callouts=[])
    buf = render_analytical_read(payload)
    assert len(buf.read()) > 1024


def test_analytical_read_template_renders_structured_sections():
    html = _render_html("analytical_read.html.j2", _analytical_payload())

    assert "QUALIFICATION GATE" in html
    assert "Per-site chemistry read" in html
    assert "[EV-01]" in html
    assert "Treatment fit by site" in html
    assert "Buyer archetype matrix" in html
    assert "~3,400 MT/month" in html
    assert "Required gaps and regulatory flags" in html


def test_ideation_brief_template_converts_emoji_markers_to_professional_markers():
    payload = _ideation_payload(
        sections=[
            IdeationSection(
                title="Commercial angle",
                lead="💡 Insight: Buyer fit is strongest in alkaline reuse.",
                body=(
                    "🔴 Red flag: H2S needs specialist handling. "
                    "👉 Next step: validate volumes. "
                    "✅ Fit: route as segregated stream. "
                    "⚠️ Warning: do not blend. "
                    "❌ Gap: latest COA missing."
                ),
                close="No emojis should remain in the rendered handover.",
                emphasis="insight",
            )
        ],
        strategic_insight="💡 Lead with segregation economics.",
        markers_used=["insight", "caution", "gap"],
    )

    html = _render_html("ideation_brief.html.j2", payload)

    for emoji in ("🔴", "👉", "✅", "⚠️", "⚠", "❌", "💡"):
        assert emoji not in html
    assert 'class="marker-insight"' in html
    assert 'class="marker-caution"' in html
    assert 'class="marker-gap"' in html
    assert "Insight:" in html
    assert "Caution:" in html
    assert "Gap:" in html


def test_ideation_brief_template_renders_structured_sub_sections():
    payload = _ideation_payload(
        gate_blockers=["Volume split pending", "Route economics need validation"],
        sections=[
            IdeationSection(
                title="Commercial Shape",
                lead="The opportunity is real, but it is not one stream.",
                sub_sections=[
                    IdeationSubSection(
                        title="Segregate before pricing",
                        lead="Treat the four sites as a portfolio, not a blend.",
                        bullets=[
                            "Preserve high-fit alkaline reuse material.",
                            "Keep H2S-heavy material out of buyer qualification.",
                        ],
                        emphasis="insight",
                    ),
                    IdeationSubSection(
                        label="B",
                        title="Open risk",
                        body="The missing volume split still blocks firm routing.",
                        emphasis="gap",
                    ),
                ],
                close="Assessment should validate the split first.",
            )
        ],
    )

    html = _render_html("ideation_brief.html.j2", payload)

    assert 'class="section-h2"' in html
    assert "A.</span>" in html
    assert "B.</span>" in html
    assert "Segregate before pricing" in html
    assert "Preserve high-fit alkaline reuse material." in html
    assert "The missing volume split still blocks firm routing." in html
    assert "Volume split pending<br>Route economics need validation" in html


def test_ideation_brief_template_renders_safety_callouts():
    payload = _ideation_payload(
        safety_callouts=[
            SafetyFlag(
                severity="specialist",
                sub_stream="Site A",
                description="H2S handling risk above normal thresholds",
                intervention="Specialist review before routing",
            )
        ]
    )

    html = _render_html("ideation_brief.html.j2", payload)

    assert "SAFETY FLAG — AMBER" in html
    assert "Site A: H2S handling risk above normal thresholds" in html
    assert "Specialist review before routing" in html


def test_ideation_brief_template_supports_legacy_gate_blocker():
    html = _render_html(
        "ideation_brief.html.j2",
        _ideation_payload(gate_blocker="Single blocker remains", gate_blockers=[]),
    )

    assert "Single blocker remains" in html


def test_ideation_brief_template_still_renders_flat_payload():
    html = _render_html("ideation_brief.html.j2", _ideation_payload())

    assert "Four sites, four different streams." in html
    assert "The opportunity requires segregation strategy." in html
    assert '<h3 class="section-h2"' not in html


def test_ideation_brief_template_does_not_duplicate_numbered_headings():
    payload = _ideation_payload(
        sections=[
            IdeationSection(
                title="1. Volume & Continuity",
                lead="Four sites, four streams.",
                body="Segregation strategy required.",
            ),
            IdeationSection(
                title="2) Safety Profile",
                lead="H2S risk present.",
                body="Specialist handling required.",
            ),
        ]
    )

    html = _render_html("ideation_brief.html.j2", payload)

    assert "1. Volume &amp; Continuity" in html
    assert "2. Safety Profile" in html
    assert "1. 1. Volume" not in html
    assert "2. 2) Safety" not in html


def test_ideation_brief_template_renders_professional_marker_legend():
    html = _render_html(
        "ideation_brief.html.j2",
        _ideation_payload(markers_used=["insight", "caution", "gap"]),
    )

    assert "Marker legend" in html
    assert "Commercial insight — the move that changes the deal" in html
    assert "Caution — a nuance that changes routing or pricing" in html
    assert "Gap — information needed before moving forward" in html
    assert "💡" not in html


def test_pdf_cover_uses_current_secondstream_logo_asset():
    """The agent PDFs should use the canonical frontend brand logo."""
    frontend_logo = Path(__file__).resolve().parents[3] / "frontend" / "public" / "3.svg"
    pdf_logo = PDF_TEMPLATE_DIR / "assets" / "secondstream_logo.svg"

    assert pdf_logo.read_text() == frontend_logo.read_text()


@requires_weasyprint
def test_playbook_renders_pdf():
    from app.services.pdf_renderer import render_playbook

    buf = render_playbook(_playbook_payload())
    data = buf.read()
    assert data[:4] == b"%PDF"
    assert len(data) > 1024


@requires_weasyprint
def test_playbook_single_theme():
    from app.services.pdf_renderer import render_playbook

    payload = _playbook_payload(themes=[PlaybookTheme(number=1, title="Test", body="Body.")])
    buf = render_playbook(payload)
    assert len(buf.read()) > 1024


def test_playbook_template_renders_orientation_followups_and_killer_questions():
    html = _render_html("playbook.html.j2", _playbook_payload())

    assert "The killer questions are in Theme 11" in html
    assert "Ballpark is fine." in html
    assert "Smart Questions — The High-Impact Set" in html
    assert "killer-question-box" in html
    assert "Can you give me a rough volume split" in html
