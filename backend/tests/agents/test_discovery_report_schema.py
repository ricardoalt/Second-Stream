import pytest
from pydantic import ValidationError

from app.agents.discovery_report_schema import DiscoveryReportPayload


def _section(idx: int) -> dict[str, str]:
    return {
        "title": f"Section {idx}",
        "lead": "Lead",
        "body": "Body",
        "close": "Close",
    }


def _payload_with_sections(count: int) -> dict:
    return {
        "customer": "ExxonMobil",
        "stream": "spent caustic",
        "snapshot": "snapshot",
        "gate_status": "OPEN",
        "safety_callouts": [],
        "sections": [_section(i) for i in range(count)],
        "killer_question": {
            "question": "What is the single most material risk?",
            "why_it_matters": "Defines project economics.",
        },
        "strategic_insight": "Strategic insight.",
    }


def test_discovery_report_payload_requires_exactly_eight_sections():
    with pytest.raises(ValidationError):
        DiscoveryReportPayload.model_validate(_payload_with_sections(7))

    with pytest.raises(ValidationError):
        DiscoveryReportPayload.model_validate(_payload_with_sections(9))

    payload = DiscoveryReportPayload.model_validate(_payload_with_sections(8))
    assert len(payload.sections) == 8


def test_discovery_report_payload_follow_up_questions_default_isolated_per_instance():
    first = DiscoveryReportPayload.model_validate(_payload_with_sections(8))
    second = DiscoveryReportPayload.model_validate(_payload_with_sections(8))

    first.follow_up_questions.append(
        {
            "question": "What chloride variability changes disposal route?",
            "why_it_matters": "Affects margin and risk.",
        }
    )
    assert second.follow_up_questions == []
