"""AI agent for workspace insights refresh."""

from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.workspace_insights_output import WorkspaceInsightsOutput

logger = structlog.get_logger(__name__)


class WorkspaceInsightsError(Exception):
    """Custom exception for workspace insights failures."""


@dataclass
class WorkspaceInsightsContext:
    base_fields: str
    existing_custom_fields: str


def load_workspace_insights_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "workspace-insights.md"
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("workspace_insights_prompt_loaded", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("workspace_insights_prompt_missing", path=str(prompt_path))
        raise


_BASE_PROMPT = load_workspace_insights_prompt()

# Extract model name from settings (remove 'bedrock:' prefix)
_BEDROCK_MODEL_NAME = settings.AI_TEXT_MODEL.replace("bedrock:", "")

workspace_insights_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=WorkspaceInsightsContext,
    output_type=WorkspaceInsightsOutput,
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
    system_prompt=_BASE_PROMPT,
)


@workspace_insights_agent.system_prompt
def inject_workspace_context(ctx: RunContext[WorkspaceInsightsContext]) -> str:
    return (
        "Fixed base fields (never propose these as new fields):\n"
        f"{ctx.deps.base_fields}\n\n"
        "Existing custom field labels (do not propose duplicates or edits):\n"
        f"{ctx.deps.existing_custom_fields}"
    )


async def analyze_workspace_insights(
    *,
    evidence_payload: str,
    context_note: str | None,
    base_fields: str,
    existing_custom_fields: str,
) -> WorkspaceInsightsOutput:
    try:
        context_block = context_note.strip() if context_note else ""
        user_prompt = (
            "Refresh workspace insights from persisted evidence.\n\n"
            f"Workspace context note (instruction only, not independent evidence):\n{context_block or '(none)'}\n\n"
            f"Evidence digest:\n{evidence_payload}"
        )
        result = await workspace_insights_agent.run(
            user_prompt,
            deps=WorkspaceInsightsContext(
                base_fields=base_fields,
                existing_custom_fields=existing_custom_fields,
            ),
        )
        return WorkspaceInsightsOutput.model_validate(result.output)
    except Exception as exc:
        logger.error("workspace_insights_failed", error=str(exc))
        raise WorkspaceInsightsError(str(exc)) from exc
