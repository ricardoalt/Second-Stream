"""Single chat agent wrapper for phase-1 chat responses."""

import asyncio
import json
import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from io import BytesIO
from typing import Any
from uuid import uuid4

import structlog
from anyio import BrokenResourceError
from pydantic import BaseModel, Field, ValidationError
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.messages import (
    DocumentUrl,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartStartEvent,
    RetryPromptPart,
    TextPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    UserContent,
)
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.run import AgentRunResultEvent
from pydantic_ai.settings import ModelSettings

from app.agents.analytical_read_schema import AnalyticalReadPayload
from app.agents.chat_skill_loader import resolve_active_skills
from app.agents.ideation_brief_schema import IdeationBriefPayload
from app.agents.playbook_schema import PlaybookPayload
from app.agents.shared_schema import PdfAttachmentOutput
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
    attachments: tuple[ChatAgentAttachmentInput, ...] = ()
    persist_attachment: Callable[..., Any] | None = None
    upload_bytes: Callable[..., Any] | None = None


class ChatAgentOutput(BaseSchema):
    response_text: str = Field(..., min_length=1)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40]


_BEDROCK_MODEL_NAME = settings.AI_TEXT_MODEL.replace("bedrock:", "")
_PDF_TOOL_NAMES = {
    "generateIdeationBrief",
    "generateAnalyticalRead",
    "generatePlaybook",
}


async def _upload_pdf(
    ctx: RunContext[ChatAgentDeps],
    *,
    payload: Any,
    renderer: Callable[[Any], BytesIO],
    filename_suffix: str,
    tool_name: str,
) -> PdfAttachmentOutput:
    """Render a PDF, upload to S3, persist attachment record, return attachment_id.

    Presigned URLs are intentionally not exposed; the frontend resolves downloads
    via the persistent backend attachment endpoint using attachment_id.

    payload must expose .customer and .stream for filename construction.
    renderer is a callable that accepts the payload and returns a BytesIO PDF.
    """
    customer_slug = _slug(str(getattr(payload, "customer", "")))
    stream_slug = _slug(str(getattr(payload, "stream", "")))
    filename = f"{customer_slug}-{stream_slug}_{date.today():%Y-%m-%d}_{filename_suffix}.pdf"

    pdf_bytes = await asyncio.to_thread(renderer, payload)
    size_bytes = len(pdf_bytes.getvalue())
    storage_key = (
        f"chat/{ctx.deps.organization_id}/{ctx.deps.user_id}/{date.today():%Y/%m}/{uuid4().hex}.pdf"
    )

    if ctx.deps.upload_bytes is not None and ctx.deps.persist_attachment is None:
        raise ChatAgentError(
            "persist_attachment is required when upload_bytes is configured for PDF tools"
        )

    if ctx.deps.upload_bytes is not None:
        await ctx.deps.upload_bytes(storage_key, pdf_bytes, "application/pdf")

    download_url = None
    expires_at = None
    attachment_id = str(uuid4())

    view_url = None

    if ctx.deps.persist_attachment is not None:
        ref = await ctx.deps.persist_attachment(
            storage_key=storage_key,
            filename=filename,
            content_type="application/pdf",
            size_bytes=size_bytes,
            artifact_type=tool_name,
        )
        attachment_id = str(ref.id)
        # Presigned URLs are intentionally not exposed; frontend resolves via attachment_id

    logger.info("pdf_uploaded", filename=filename, size_bytes=size_bytes)
    return PdfAttachmentOutput(
        attachment_id=attachment_id,
        filename=filename,
        download_url=download_url,
        view_url=view_url,
        expires_at=expires_at,
        size_bytes=size_bytes,
    )


def _make_agent() -> Agent:
    from app.agents.chat_skill_loader import (
        build_conditional_instructions_fn,
        compile_base_instructions,
    )

    agent: Agent[ChatAgentDeps, str] = Agent(
        BedrockConverseModel(
            _BEDROCK_MODEL_NAME,
            provider=BedrockProvider(region_name=settings.AWS_REGION),
        ),
        deps_type=ChatAgentDeps,
        output_type=str,
        retries=2,
        model_settings=ModelSettings(max_tokens=16384),
        instructions=compile_base_instructions(),
    )

    conditional_fn = build_conditional_instructions_fn()

    @agent.instructions
    def _conditional_instructions(ctx: RunContext[ChatAgentDeps]) -> str:
        return conditional_fn(ctx)

    _register_tools(agent)
    return agent


def _register_tools(agent: Agent) -> None:
    """Register all tools on the agent instance."""

    @agent.tool(name="generateIdeationBrief")
    async def generate_ideation_brief(
        ctx: RunContext[ChatAgentDeps],
        payload: IdeationBriefPayload,
    ) -> PdfAttachmentOutput:
        """Generate an Ideation Brief PDF.

        Tool args are flat top-level fields, e.g. {"customer": "Acme", ...}; do not pass {"payload": {...}}.
        """
        from app.services.pdf_renderer import render_ideation_brief

        return await _upload_pdf(ctx, payload=payload, renderer=render_ideation_brief, filename_suffix="ideation-brief", tool_name="generateIdeationBrief")

    @agent.tool(name="generateAnalyticalRead")
    async def generate_analytical_read(
        ctx: RunContext[ChatAgentDeps],
        payload: AnalyticalReadPayload,
    ) -> PdfAttachmentOutput:
        """Generate an Analytical Read PDF.

        Tool args are flat top-level fields, e.g. {"customer": "Acme", ...}; do not pass {"payload": {...}}.
        """
        from app.services.pdf_renderer import render_analytical_read

        return await _upload_pdf(ctx, payload=payload, renderer=render_analytical_read, filename_suffix="analytical-read", tool_name="generateAnalyticalRead")

    @agent.tool(name="generatePlaybook")
    async def generate_playbook(
        ctx: RunContext[ChatAgentDeps],
        payload: PlaybookPayload,
    ) -> PdfAttachmentOutput:
        """Generate a Discovery Playbook PDF.

        Tool args are flat top-level fields, e.g. {"customer": "Acme", ...}; do not pass {"payload": {...}}.
        """
        from app.services.pdf_renderer import render_playbook

        return await _upload_pdf(ctx, payload=payload, renderer=render_playbook, filename_suffix="playbook", tool_name="generatePlaybook")


chat_agent = _make_agent()


async def generate_chat_response(
    *,
    prompt: str | list[str | UserContent],
    deps: ChatAgentDeps,
) -> ChatAgentOutput:
    """Run the chat agent with typed dependencies and validated output."""
    from types import SimpleNamespace

    active_skills = resolve_active_skills(SimpleNamespace(deps=deps))
    logger.info(
        "chat_agent_run_started",
        run_id=deps.run_id,
        thread_id=deps.thread_id,
        organization_id=deps.organization_id,
        user_id=deps.user_id,
        active_skills=active_skills,
        attachment_count=len(deps.attachments),
    )
    try:
        result = await chat_agent.run(prompt, deps=deps)
        return ChatAgentOutput(response_text=result.output.strip())
    except ValidationError as exc:
        logger.error(
            "chat_agent_result_validation_failed",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            active_skills=active_skills,
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
            active_skills=active_skills,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent execution failed") from exc


def _build_runtime_user_content(
    *,
    prompt: str,
    attachments: list[ChatAgentAttachmentInput],
) -> str | list[str | UserContent]:
    """Build the user prompt with inline attachment content for Bedrock."""
    content: list[str | UserContent] = [prompt]

    for attachment in attachments:
        if attachment.media_type.startswith("text/") and attachment.extracted_text:
            content.append(f"Attachment text ({attachment.filename}):\n{attachment.extracted_text}")
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
        return prompt
    return content


async def stream_chat_response(
    *,
    prompt: str,
    deps: ChatAgentDeps,
    attachments: list[ChatAgentAttachmentInput],
):
    """Stream chat response deltas and tool events from the agent runtime."""
    from types import SimpleNamespace

    runtime_input = _build_runtime_user_content(prompt=prompt, attachments=attachments)
    accumulated_text = ""
    tool_call_ids_by_index: dict[int, str] = {}
    tool_names_by_call_id: dict[str, str] = {}
    tools_called: list[dict[str, str]] = []
    active_skills = resolve_active_skills(SimpleNamespace(deps=deps))
    logger.info(
        "chat_agent_run_started",
        run_id=deps.run_id,
        thread_id=deps.thread_id,
        organization_id=deps.organization_id,
        user_id=deps.user_id,
        active_skills=active_skills,
        attachment_count=len(attachments),
    )
    try:
        async for event in chat_agent.run_stream_events(runtime_input, deps=deps):
            if isinstance(event, AgentRunResultEvent):
                response_text = accumulated_text.strip() or str(event.result.output).strip()
                yield {"event": "completed", "response_text": response_text}
                return

            if isinstance(event, PartStartEvent) and isinstance(event.part, ToolCallPart):
                tool_call_ids_by_index[event.index] = event.part.tool_call_id
                tool_names_by_call_id[event.part.tool_call_id] = event.part.tool_name
                logger.info(
                    "chat_agent_tool_started",
                    run_id=deps.run_id,
                    tool_name=event.part.tool_name,
                    tool_call_id=event.part.tool_call_id,
                )
                tools_called.append(
                    {"tool_name": event.part.tool_name, "tool_call_id": event.part.tool_call_id}
                )
                yield {
                    "event": "tool-input-start",
                    "toolCallId": event.part.tool_call_id,
                    "toolName": event.part.tool_name,
                }
                continue

            if isinstance(event, PartDeltaEvent) and isinstance(event.delta, ToolCallPartDelta):
                args_delta = event.delta.args_delta
                tool_call_id = event.delta.tool_call_id or tool_call_ids_by_index.get(event.index)
                if tool_call_id and args_delta is not None:
                    if tool_names_by_call_id.get(tool_call_id) in _PDF_TOOL_NAMES:
                        continue
                    input_text_delta = (
                        args_delta if isinstance(args_delta, str) else json.dumps(args_delta)
                    )
                    yield {
                        "event": "tool-input-delta",
                        "toolCallId": tool_call_id,
                        "inputTextDelta": input_text_delta,
                    }
                continue

            if isinstance(event, FunctionToolCallEvent):
                yield {
                    "event": "tool-input-available",
                    "toolCallId": event.part.tool_call_id,
                    "toolName": event.part.tool_name,
                    "input": event.part.args_as_dict(),
                }
                continue

            if isinstance(event, FunctionToolResultEvent):
                if isinstance(event.result, RetryPromptPart):
                    error_text = event.result.model_response()
                    logger.info(
                        "tool_retry_prompt_suppressed",
                        tool_call_id=event.result.tool_call_id,
                        tool_name=event.result.tool_name,
                        run_id=deps.run_id,
                        error_text_preview=error_text[:200] if error_text else None,
                        error_text_length=len(error_text) if error_text else 0,
                    )
                    # RetryPromptPart is an internal Pydantic AI retry signal, not a
                    # terminal user-visible error. Suppress from user-facing stream.
                    continue
                else:
                    logger.info(
                        "chat_agent_tool_completed",
                        run_id=deps.run_id,
                        tool_name=event.result.tool_name,
                        tool_call_id=event.result.tool_call_id,
                    )
                    output_object = event.result.model_response_object()
                    if isinstance(output_object, BaseModel):
                        output: Any = output_object.model_dump()
                    elif isinstance(output_object, dict) and "return_value" in output_object:
                        output = output_object["return_value"]
                    else:
                        output = output_object

                    yield {
                        "event": "tool-output-available",
                        "toolCallId": event.result.tool_call_id,
                        "output": output,
                    }
                continue

            if isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
                delta = event.delta.content_delta
                if delta:
                    accumulated_text += delta
                    yield {"event": "delta", "delta": delta}

        raise ChatAgentError("Chat agent stream ended without terminal result")
    except (asyncio.CancelledError, BrokenResourceError):
        logger.info(
            "chat_agent_stream_cancelled",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            active_skills=active_skills,
            tools_called=tools_called,
        )
        raise
    except ChatAgentError:
        raise
    except Exception as exc:
        logger.error(
            "chat_agent_stream_failed",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            active_skills=active_skills,
            tools_called=tools_called,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent streaming failed") from exc
