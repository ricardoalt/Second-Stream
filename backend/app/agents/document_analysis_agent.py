"""AI agent for analyzing documents (LLM-only MVP)."""

from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.document_analysis_output import DocumentAnalysisOutput

logger = structlog.get_logger(__name__)


class DocumentAnalysisError(Exception):
    """Custom exception for document analysis failures."""

    pass


MAX_DOC_BYTES = 10 * 1024 * 1024  # 10 MB


@dataclass
class DocumentContext:
    filename: str
    doc_type: str
    field_catalog: str


def load_document_analysis_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "document-analysis.md"
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("✅ Loaded document analysis prompt", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("❌ Prompt file not found", path=str(prompt_path))
        raise


_BASE_PROMPT = load_document_analysis_prompt()

# Extract model name from settings (remove 'bedrock:' prefix)
_BEDROCK_MODEL_NAME = settings.AI_DOCUMENT_MODEL.replace("bedrock:", "")

document_analysis_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=DocumentContext,
    output_type=DocumentAnalysisOutput,
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
    system_prompt=_BASE_PROMPT,
)


@document_analysis_agent.system_prompt
def inject_document_context(ctx: RunContext[DocumentContext]) -> str:
    """Inject document context for proposal-only extraction."""
    return (
        f"Document type: {ctx.deps.doc_type}\n\n"
        "Workspace base fields available for base_field proposals: "
        "material_type, material_name, composition, volume, frequency.\n\n"
        "Additional extraction context:\n"
        f"{ctx.deps.field_catalog}"
    )


async def analyze_document(
    document_bytes: bytes | None,
    filename: str,
    doc_type: str,
    field_catalog: str,
    media_type: str = "application/pdf",
    extracted_text: str | None = None,
) -> DocumentAnalysisOutput:
    if document_bytes is None and not extracted_text:
        raise DocumentAnalysisError(f"Empty document: {filename}")

    # Reject binary documents larger than 10 MB
    if document_bytes is not None and len(document_bytes) > MAX_DOC_BYTES:
        raise DocumentAnalysisError(
            f"Document too large: {filename} ({len(document_bytes) / 1024 / 1024:.1f} MB). "
            f"Maximum size is {MAX_DOC_BYTES / 1024 / 1024:.0f} MB."
        )

    try:
        context = DocumentContext(
            filename=filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
        )
        if extracted_text is not None:
            prompt_input: list[str | BinaryContent] = [
                "Analyze this normalized document text and extract workspace proposals with evidence:",
                extracted_text,
            ]
        else:
            if document_bytes is None:
                raise DocumentAnalysisError(f"Empty document: {filename}")
            prompt_input = [
                "Analyze this document and extract workspace proposals with evidence:",
                BinaryContent(data=document_bytes, media_type=media_type),
            ]
        result = await document_analysis_agent.run(prompt_input, deps=context)

        output = DocumentAnalysisOutput.model_validate(result.output)
        return output
    except Exception as exc:
        logger.error("document_analysis_failed", filename=filename, error=str(exc))
        raise DocumentAnalysisError(str(exc)) from exc
