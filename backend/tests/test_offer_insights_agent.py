import uuid
from types import SimpleNamespace

import pytest

import app.agents.offer_insights_agent as offer_agent_module
from app.agents.offer_insights_agent import OfferInsightsError, analyze_offer_insights
from app.models.offer_insights_output import OfferInsightsOutput


@pytest.mark.asyncio
async def test_analyze_offer_insights_returns_validated_output(monkeypatch):
    captured = {"prompt": "", "deps": None}

    async def _fake_run(prompt, *, deps):
        captured["prompt"] = prompt
        captured["deps"] = deps
        return SimpleNamespace(
            output={
                "summary": "Strong stream baseline with clear reuse potential.",
                "key_points": ["Stable weekly volume"],
                "risks": ["Missing disposal contract copy"],
                "recommendations": ["Request compliance annex before sending offer"],
            }
        )

    monkeypatch.setattr(offer_agent_module.offer_insights_agent, "run", _fake_run)

    result = await analyze_offer_insights(
        project_id=str(uuid.uuid4()),
        evidence_payload="- material: PET flakes\n- cadence: weekly",
    )

    assert isinstance(result, OfferInsightsOutput)
    assert result.summary
    assert "Evidence digest" in captured["prompt"]
    assert captured["deps"].project_id


@pytest.mark.asyncio
async def test_analyze_offer_insights_wraps_agent_failures(monkeypatch):
    async def _boom(*_args, **_kwargs):
        raise RuntimeError("llm unavailable")

    monkeypatch.setattr(offer_agent_module.offer_insights_agent, "run", _boom)

    with pytest.raises(OfferInsightsError):
        await analyze_offer_insights(project_id=str(uuid.uuid4()), evidence_payload="evidence")


def test_offer_insights_prompt_is_loaded():
    prompt = offer_agent_module.load_offer_insights_prompt()
    assert isinstance(prompt, str)
    assert prompt.strip()
    assert "NEVER analyze uploaded offer documents" in prompt
