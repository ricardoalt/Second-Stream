"""
AI Agent for analyzing waste resource images.

Uses pydantic-ai with BinaryContent for vision model capabilities.
Extracts structured business intelligence from photos of waste materials.
"""

from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.image_analysis_output import ImageAnalysisOutput

logger = structlog.get_logger(__name__)


class ImageAnalysisError(Exception):
    """Custom exception for image analysis failures."""

    pass


@dataclass
class ImageContext:
    """Context for image analysis."""

    filename: str
    project_sector: str | None = None
    project_subsector: str | None = None


def load_image_analysis_prompt() -> str:
    """
    Load image analysis prompt from external markdown file.
    Follows same pattern as proposal_agent for consistency.
    """
    prompt_path = Path(__file__).parent.parent / "prompts" / "image-analysis.md"

    try:
        with prompt_path.open(encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")

        logger.info(f"✅ Loaded image analysis prompt from: {prompt_path.name}")
        return content

    except FileNotFoundError:
        logger.error(f"❌ Prompt file not found: {prompt_path}")
        raise
    except Exception as e:
        logger.error(f"❌ Error loading prompt: {e}")
        raise


# Extract model name from settings (remove 'bedrock:' prefix)
_BEDROCK_MODEL_NAME = settings.AI_IMAGE_MODEL.replace("bedrock:", "")

# Create the image analysis agent
image_analysis_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=ImageContext,
    output_type=ImageAnalysisOutput,
    instructions=load_image_analysis_prompt(),
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
)


@image_analysis_agent.instructions
def inject_project_context(ctx: RunContext[ImageContext]) -> str:
    """Inject project context when available."""
    if not ctx.deps.project_sector:
        return ""

    context_parts = [f"Industry Sector: {ctx.deps.project_sector}"]
    if ctx.deps.project_subsector:
        context_parts.append(f"Subsector: {ctx.deps.project_subsector}")

    return f"""
PROJECT CONTEXT:
{chr(10).join(context_parts)}

Use this context to refine your analysis for industry-specific waste streams.
"""


async def analyze_image(
    image_data: bytes,
    filename: str,
    media_type: str = "image/jpeg",
    project_sector: str | None = None,
    project_subsector: str | None = None,
) -> ImageAnalysisOutput:
    """
    Analyze a waste resource image using vision AI.

    Args:
        image_data: Raw image bytes
        filename: Original filename (for logging)
        media_type: MIME type (image/jpeg, image/png)
        project_sector: Optional industry sector for context
        project_subsector: Optional subsector for context

    Returns:
        ImageAnalysisOutput: Structured analysis with business insights

    Raises:
        ImageAnalysisError: If analysis fails
    """
    if not image_data:
        raise ImageAnalysisError(f"Empty image data for: {filename}")

    try:
        logger.info(f"🖼️  Analyzing image: {filename} ({len(image_data):,} bytes)")

        context = ImageContext(
            filename=filename,
            project_sector=project_sector,
            project_subsector=project_subsector,
        )

        result = await image_analysis_agent.run(
            [
                "Analyze this waste resource image for business opportunities:",
                BinaryContent(data=image_data, media_type=media_type),
            ],
            deps=context,
        )

        # Log success with usage info
        usage = result.usage()
        if usage:
            logger.info(f"✅ Image analysis complete: {filename}")
            logger.info(f"📊 Token usage: {usage.total_tokens:,} tokens")

        # Log key findings
        output = ImageAnalysisOutput.model_validate(result.output)
        logger.info(
            f"📋 Material: {output.material_type} | "
            f"Quality: {output.quality_grade} | "
            f"Confidence: {output.confidence}"
        )

        return output

    except Exception as e:
        logger.error(f"❌ Image analysis failed for {filename}: {e}", exc_info=True)
        raise ImageAnalysisError(f"Failed to analyze image {filename}: {e}") from e
