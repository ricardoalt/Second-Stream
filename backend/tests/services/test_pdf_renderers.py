"""Tests for the generic pdf_renderer and the three new document types.

WeasyPrint requires system C libraries (Cairo, Pango, libgobject).
Tests are skipped when those are not present (dev machine without brew deps).
Run these in Docker via `make test-file FILE=tests/services/test_pdf_renderers.py`.
"""

import pytest

weasyprint_available = True
try:
    import weasyprint  # noqa: F401
except (OSError, ImportError):
    weasyprint_available = False

requires_weasyprint = pytest.mark.skipif(
    not weasyprint_available,
    reason="WeasyPrint system libraries (libgobject, Cairo, Pango) not installed",
)

from app.agents.analytical_read_schema import AnalyticalReadPayload, AnalyticalTable
from app.agents.shared_schema import SafetyFlag
from app.agents.ideation_brief_schema import IdeationBriefPayload, IdeationSection
from app.agents.playbook_schema import PlaybookPayload, PlaybookTheme

# ── Payload factories ──────────────────────────────────────────────────── #


def _ideation_payload(**overrides) -> IdeationBriefPayload:
    defaults: dict = {
        "customer": "ExxonMobil",
        "stream": "Spent Sulfidic Caustic",
        "date": "2026-04-25",
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
                title="Stream Comparison",
                headers=["Stream", "pH", "H2S (ppm)", "Volume (gal/mo)"],
                rows=[
                    ["Caustic A", "12.1", "80", "45,000"],
                    ["Caustic B", "11.8", "30", "22,000"],
                    ["Caustic C", "13.0", "5", "10,000"],
                ],
            )
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
        "opening_context": "Greenfield opportunity — first meeting. Focus on volume validation.",
        "themes": [
            PlaybookTheme(
                number=1,
                title="Volume & Continuity",
                body="Understand the generation rate and how stable it is across quarters.",
                probe_questions=[
                    "What is the monthly volume today?",
                    "Has the rate been consistent over the past 12 months?",
                ],
                why_it_matters=[
                    "Volume dictates routing economics.",
                    "Variability above 20% changes the deal structure.",
                ],
            ),
            PlaybookTheme(
                number=2,
                title="Regulatory Posture",
                body="Understand disposal constraints driving urgency.",
                probe_questions=["Are you under any consent orders or NOVs?"],
                why_it_matters=["Urgency unlocks faster deal cycles."],
            ),
        ],
    }
    defaults.update(overrides)
    return PlaybookPayload(**defaults)


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
