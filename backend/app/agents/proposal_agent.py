"""
AI Agent for generating waste upcycling feasibility reports.

Design principles:
- DRY: Single context injection, no repeated data
- Fail fast: Lazy API key check
- Less code: ~100 lines instead of ~300
- Good names: project_data instead of water_data
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import structlog
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings
from pydantic_ai.usage import UsageLimits

from app.core.config import settings
from app.models.project_input import FlexibleWaterProjectData
from app.models.proposal_output import ProposalOutput

logger = structlog.get_logger(__name__)


class ProposalGenerationError(Exception):
    """Raised when proposal generation fails."""

    pass


@dataclass
class ProposalContext:
    """Context for proposal generation."""

    project_data: FlexibleWaterProjectData
    client_metadata: dict[str, Any]
    photo_insights: list[dict[str, Any]] | None = None
    document_insights: list[dict[str, Any]] | None = None


def _load_prompt() -> str:
    """Load prompt from external file."""
    path = Path(__file__).parent.parent / "prompts" / "waste-upcycling-report.v3.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    return path.read_text(encoding="utf-8").strip()


# Extract model name from settings (remove 'bedrock:' prefix)
_BEDROCK_MODEL_NAME = settings.AI_PROPOSAL_MODEL.replace("bedrock:", "")

# Initialize agent with Bedrock provider configured with region
proposal_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=ProposalContext,
    output_type=ProposalOutput,
    instructions=_load_prompt(),
    model_settings=ModelSettings(temperature=0.4),
    retries=2,
)


@proposal_agent.instructions
def inject_context(ctx: RunContext[ProposalContext]) -> str:
    """
    Single context injection (DRY principle).

    Combines: project context, waste data, client metadata, and photo insights.
    """
    meta = ctx.deps.client_metadata
    data = ctx.deps.project_data
    photos = ctx.deps.photo_insights
    documents = ctx.deps.document_insights

    # Build context sections
    sections = []

    # 1. Project context
    sections.append(f"""
PROJECT:
- Company: {meta.get("company_name", "N/A")}
- Sector: {meta.get("selected_sector", "Industrial")} / {meta.get("selected_subsector", "General")}
- Location: {meta.get("user_location", "Not specified")}
""")

    # 2. Waste assessment data (clean, no UI metadata)
    ai_context = data.to_ai_context()
    formatted = data.format_ai_context_to_string(ai_context)
    sections.append(f"""
WASTE ASSESSMENT:
{formatted}
""")

    # 3. Photo insights (if available) - pass LCA data for environmental sections
    if photos:
        photo_sections = []
        for i, p in enumerate(photos, 1):
            # Core identification
            material = p.get("material_type", "Unknown")
            quality = p.get("quality_grade", "Unknown")
            lifecycle = p.get("lifecycle_status", "Unknown")
            confidence = p.get("confidence", "Medium")

            # LCA data
            co2_savings = p.get("co2_savings", 0)
            esg_statement = p.get("esg_statement", "")
            lca_assumptions = p.get("lca_assumptions", "")

            # Handling
            storage = p.get("storage_requirements", [])
            ppe = p.get("ppe_requirements", [])
            hazards = p.get("visible_hazards", [])

            photo_sections.append(f"""
PHOTO {i}: {material} (confidence: {confidence})
- Quality: {quality} | Lifecycle: {lifecycle}
- CO₂ savings: {co2_savings} tCO₂e/year
- ESG statement: {esg_statement}
- LCA basis: {lca_assumptions if lca_assumptions else "N/A"}
- Storage: {", ".join(storage) if storage else "N/A"}
- PPE: {", ".join(ppe) if ppe else "Standard"}
- Visible hazards: {", ".join(hazards) if hazards else "None"}
""")

        sections.append(f"""
PHOTO ANALYSIS (use CO₂ data for environmental sections, generate your own pricing/buyers):
{"".join(photo_sections)}
""")

    if documents:
        doc_sections = []
        for i, doc in enumerate(documents, 1):
            summary = doc.get("summary") or "N/A"
            key_facts = doc.get("keyFacts") or []
            if isinstance(key_facts, list):
                facts_text = "; ".join(str(fact) for fact in key_facts if fact)
            else:
                facts_text = str(key_facts)
            doc_sections.append(f"""
DOCUMENT {i}:
- Summary: {summary}
- Key facts: {facts_text if facts_text else "N/A"}
""")

        sections.append(f"""
DOCUMENT INSIGHTS (use for compliance, handling, and pricing context):
{"".join(doc_sections)}
""")

    return "".join(sections)


async def generate_proposal(
    project_data: FlexibleWaterProjectData,
    client_metadata: dict[str, Any] | None = None,
    photo_insights: list[dict[str, Any]] | None = None,
    document_insights: list[dict[str, Any]] | None = None,
) -> ProposalOutput:
    """
    Generate waste upcycling feasibility report.

    Args:
        project_data: Waste assessment questionnaire data
        client_metadata: Client info (company, sector, location)
        photo_insights: Optional photo analysis from image_analysis_agent
        document_insights: Optional document analysis summaries/key facts

    Returns:
        ProposalOutput with GO/NO-GO decision and analysis

    Raises:
        ProposalGenerationError: On failure
    """
    context = ProposalContext(
        project_data=project_data,
        client_metadata=client_metadata or {},
        photo_insights=photo_insights,
        document_insights=document_insights,
    )

    try:
        logger.info("Generating proposal...")

        result = await proposal_agent.run(
            "Generate a waste upcycling feasibility report with GO/NO-GO decision.",
            deps=context,
            usage_limits=UsageLimits(
                request_limit=3,
                total_tokens_limit=50000,  # Reduced - simpler output
            ),
        )

        # Log usage
        if usage := result.usage():
            logger.info(f"Proposal generated ({usage.total_tokens:,} tokens)")

        return ProposalOutput.model_validate(result.output)

    except Exception as e:
        logger.error(f"Proposal generation failed: {e}")
        raise ProposalGenerationError(str(e)) from e


# Backwards compatibility alias
generate_enhanced_proposal = generate_proposal
