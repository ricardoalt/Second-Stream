"""AI agents for bulk/voice extraction."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.bulk_import_ai_output import BulkImportAIOutput

logger = structlog.get_logger(__name__)


class BulkImportExtractionAgentError(Exception):
    """Raised when bulk import extraction agent fails."""


@dataclass
class BulkImportExtractionContext:
    filename: str
    extension: str


def _load_prompt(prompt_filename: str) -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / prompt_filename
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("prompt_loaded", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("prompt_missing", path=str(prompt_path))
        raise


_BULK_BASE_PROMPT = _load_prompt("bulk-import-extraction.md")
_VOICE_BASE_PROMPT = _load_prompt("voice-interview-extraction.md")

# Extract model name from settings (remove 'bedrock:' prefix)
_BEDROCK_MODEL_NAME = settings.AI_DOCUMENT_MODEL.replace("bedrock:", "")

bulk_import_extraction_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=BulkImportExtractionContext,
    output_type=BulkImportAIOutput,
    model_settings=ModelSettings(temperature=0.1),
    retries=2,
    system_prompt=_BULK_BASE_PROMPT,
)


voice_interview_extraction_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=BulkImportExtractionContext,
    output_type=BulkImportAIOutput,
    model_settings=ModelSettings(temperature=0.1),
    retries=2,
    system_prompt=_VOICE_BASE_PROMPT,
)


@bulk_import_extraction_agent.system_prompt
def inject_context(ctx: RunContext[BulkImportExtractionContext]) -> str:
    return (
        f"Filename: {ctx.deps.filename}\n"
        f"Extension: {ctx.deps.extension}\n"
        "Extract locations and waste streams as strict schema output."
    )


@voice_interview_extraction_agent.system_prompt
def inject_voice_context(ctx: RunContext[BulkImportExtractionContext]) -> str:
    return (
        f"Filename: {ctx.deps.filename}\n"
        f"Extension: {ctx.deps.extension}\n"
        "Extract locations and waste streams from transcript text as strict schema output."
    )


async def run_bulk_import_extraction_agent(
    *,
    file_bytes: bytes,
    filename: str,
    media_type: str,
) -> BulkImportAIOutput:
    if not file_bytes:
        raise BulkImportExtractionAgentError("empty_file")

    context = BulkImportExtractionContext(
        filename=filename,
        extension=Path(filename).suffix.casefold(),
    )

    try:
        result = await bulk_import_extraction_agent.run(
            [
                "Extract bulk import locations and waste streams from this file:",
                BinaryContent(data=file_bytes, media_type=media_type),
            ],
            deps=context,
        )
        return BulkImportAIOutput.model_validate(result.output)
    except Exception as exc:
        logger.error(
            "bulk_import_agent_binary_failed",
            error=str(exc),
            error_type=type(exc).__name__,
            exc_info=True,
        )
        raise BulkImportExtractionAgentError("agent_run_failed") from exc


async def run_bulk_import_extraction_agent_on_text(
    *,
    extracted_text: str,
    filename: str,
) -> BulkImportAIOutput:
    if not extracted_text.strip():
        raise BulkImportExtractionAgentError("empty_text")

    context = BulkImportExtractionContext(
        filename=filename,
        extension=Path(filename).suffix.casefold(),
    )

    try:
        result = await bulk_import_extraction_agent.run(
            [
                "Extract bulk import locations and waste streams from this text:",
                extracted_text,
            ],
            deps=context,
        )
        return BulkImportAIOutput.model_validate(result.output)
    except Exception as exc:
        logger.error(
            "bulk_import_agent_text_failed",
            error=str(exc),
            error_type=type(exc).__name__,
            exc_info=True,
        )
        raise BulkImportExtractionAgentError("agent_run_failed") from exc


async def run_voice_interview_extraction_agent_on_text(
    *,
    extracted_text: str,
    filename: str,
) -> BulkImportAIOutput:
    if not extracted_text.strip():
        raise BulkImportExtractionAgentError("empty_text")

    context = BulkImportExtractionContext(
        filename=filename,
        extension=Path(filename).suffix.casefold(),
    )

    try:
        result = await voice_interview_extraction_agent.run(
            [
                "Extract voice interview locations and waste streams from this transcript text:",
                extracted_text,
            ],
            deps=context,
        )
        return BulkImportAIOutput.model_validate(result.output)
    except Exception as exc:
        logger.error(
            "voice_agent_text_failed",
            error=str(exc),
            error_type=type(exc).__name__,
            exc_info=True,
        )
        raise BulkImportExtractionAgentError("agent_run_failed") from exc
