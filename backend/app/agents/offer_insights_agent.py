"""AI agent for Offer insights generation."""

import os
from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, RunContext
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.offer_insights_output import OfferInsightsOutput

logger = structlog.get_logger(__name__)


class OfferInsightsError(Exception):
    """Custom exception for offer insights failures."""


@dataclass
class OfferInsightsContext:
    project_id: str


if not os.getenv("OPENAI_API_KEY") and settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY


def load_offer_insights_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "offer-insights.md"
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("offer_insights_prompt_loaded", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("offer_insights_prompt_missing", path=str(prompt_path))
        raise


_BASE_PROMPT = load_offer_insights_prompt()


offer_insights_agent = Agent(
    settings.AI_TEXT_MODEL,
    deps_type=OfferInsightsContext,
    output_type=OfferInsightsOutput,
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
    system_prompt=_BASE_PROMPT,
)


@offer_insights_agent.system_prompt
def inject_offer_context(ctx: RunContext[OfferInsightsContext]) -> str:
    return (
        "Execution context:\n"
        f"- project_id: {ctx.deps.project_id}\n"
        "- analysis_source: workspace_discovery_evidence_only\n"
        "- ignore_offer_document_for_analysis: true"
    )


async def analyze_offer_insights(*, project_id: str, evidence_payload: str) -> OfferInsightsOutput:
    try:
        result = await offer_insights_agent.run(
            (
                "Generate offer insights from the evidence digest.\n\n"
                "Evidence digest:\n"
                f"{evidence_payload}"
            ),
            deps=OfferInsightsContext(project_id=project_id),
        )
        return OfferInsightsOutput.model_validate(result.output)
    except Exception as exc:
        logger.error("offer_insights_failed", error=str(exc), project_id=project_id)
        raise OfferInsightsError(str(exc)) from exc
