"""Single chat agent wrapper for phase-1 chat responses."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import structlog
from pydantic import Field, ValidationError
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.messages import DocumentUrl, UserContent
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.schemas.common import BaseSchema
from app.services.chat_stream_protocol import ChatAgentAttachmentInput

logger = structlog.get_logger(__name__)


class ChatAgentError(Exception):
    """Raised when chat agent execution fails."""


@dataclass(slots=True, frozen=True)
class ChatAgentDeps:
    organization_id: str
    user_id: str
    thread_id: str
    run_id: str


class ChatAgentOutput(BaseSchema):
    response_text: str = Field(..., min_length=1)


def _load_prompt_file(filename: str) -> str:
    path = Path(__file__).parent.parent / "prompts" / filename
    content = path.read_text(encoding="utf-8").strip()
    if not content:
        raise ValueError(f"Prompt file is empty: {path}")
    return content


def load_chat_system_prompt() -> str:
    return _load_prompt_file("chat-agent-prompt.md")


_BEDROCK_MODEL_NAME = settings.AI_TEXT_MODEL.replace("bedrock:", "")

chat_agent = Agent(
    BedrockConverseModel(
        _BEDROCK_MODEL_NAME,
        provider=BedrockProvider(region_name=settings.AWS_REGION),
    ),
    deps_type=ChatAgentDeps,
    output_type=ChatAgentOutput,
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
    system_prompt=load_chat_system_prompt(),
)


async def generate_chat_response(*, prompt: str, deps: ChatAgentDeps) -> ChatAgentOutput:
    """Run the chat agent with typed dependencies and validated output."""
    try:
        result = await chat_agent.run(prompt, deps=deps)
        return ChatAgentOutput.model_validate(result.output)
    except ValidationError as exc:
        logger.error(
            "chat_agent_result_validation_failed",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent returned invalid result schema") from exc
    except Exception as exc:
        logger.error(
            "chat_agent_run_failed",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent execution failed") from exc


def _build_attachment_context(attachments: list[ChatAgentAttachmentInput]) -> str:
    if not attachments:
        return ""

    lines = ["Attachments (resolved and approved for this turn):"]
    for index, attachment in enumerate(attachments, start=1):
        lines.append(
            f"{index}. {attachment.filename} ({attachment.media_type or 'unknown'}) "
            f"[id={attachment.attachment_id}]"
        )
        if attachment.document_url:
            lines.append(f"   document_url: {attachment.document_url}")
        elif attachment.uploaded_file_ref:
            lines.append(f"   uploaded_file_ref: {attachment.uploaded_file_ref}")
    return "\n".join(lines)


def _build_runtime_prompt(
    *,
    prompt: str,
    attachments: list[ChatAgentAttachmentInput],
) -> str:
    attachment_context = _build_attachment_context(attachments)
    if not attachment_context:
        return prompt
    return f"{prompt}\n\n{attachment_context}"


def _build_runtime_user_content(
    *,
    prompt: str,
    attachments: list[ChatAgentAttachmentInput],
) -> str | list[str | UserContent]:
    runtime_prompt = _build_runtime_prompt(prompt=prompt, attachments=attachments)
    content: list[str | UserContent] = [runtime_prompt]

    for attachment in attachments:
        if attachment.media_type.startswith("text/") and attachment.extracted_text:
            content.append(
                f"Attachment text ({attachment.filename}):\n{attachment.extracted_text}"
            )
            continue

        if attachment.binary_content:
            content.append(
                BinaryContent(
                    data=attachment.binary_content,
                    media_type=attachment.media_type or "application/octet-stream",
                )
            )
            continue

        if attachment.document_url:
            content.append(
                DocumentUrl(
                    url=attachment.document_url,
                    media_type=attachment.media_type or None,
                )
            )
            continue

    if len(content) == 1:
        return runtime_prompt
    return content


async def stream_chat_response(
    *,
    prompt: str,
    deps: ChatAgentDeps,
    attachments: list[ChatAgentAttachmentInput],
):
    """Stream chat response deltas and terminal text from the agent runtime."""
    runtime_input = _build_runtime_user_content(prompt=prompt, attachments=attachments)
    emitted_delta = False

    try:
        async with chat_agent.run_stream(runtime_input, deps=deps) as streamed_result:
            accumulated_chunks: list[str] = []
            async for delta in streamed_result.stream_text(delta=True):
                if not delta:
                    continue
                emitted_delta = True
                accumulated_chunks.append(delta)
                yield {"event": "delta", "delta": delta}

            response_text = "".join(accumulated_chunks).strip()
            if not response_text:
                output: Any = streamed_result.get_output()
                response_text = ChatAgentOutput.model_validate(output).response_text

            yield {"event": "completed", "response_text": response_text}
            return
    except Exception as exc:
        if emitted_delta:
            logger.error(
                "chat_agent_stream_failed_after_partial_output",
                organization_id=deps.organization_id,
                user_id=deps.user_id,
                thread_id=deps.thread_id,
                run_id=deps.run_id,
                error=str(exc),
            )
            raise ChatAgentError("Chat agent streaming failed") from exc

        logger.warning(
            "chat_agent_stream_unavailable_fallback_to_non_stream",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            error=str(exc),
        )

    fallback_prompt = _build_runtime_prompt(prompt=prompt, attachments=attachments)
    fallback_output = await generate_chat_response(prompt=fallback_prompt, deps=deps)
    yield {"event": "delta", "delta": fallback_output.response_text}
    yield {"event": "completed", "response_text": fallback_output.response_text}
