"""Single chat agent wrapper for phase-1 chat responses."""

import asyncio
import functools
import hashlib
import json
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4

import structlog
from anyio import BrokenResourceError
from pydantic import BaseModel, Field, ValidationError
from pydantic_ai import Agent, BinaryContent, ModelRetry, RunContext, UsageLimitExceeded
from pydantic_ai.messages import (
    DocumentUrl,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartStartEvent,
    RetryPromptPart,
    TextPart,
    TextPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    UserContent,
)
from pydantic_ai.models.bedrock import BedrockConverseModel, BedrockModelSettings
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.run import AgentRunResultEvent
from pydantic_ai.usage import UsageLimits

from app.agents.analytical_read_schema import AnalyticalReadPayload
from app.agents.chat_skill_loader import available_skill_names
from app.agents.ideation_brief_schema import IdeationBriefPayload
from app.agents.playbook_schema import PlaybookPayload
from app.agents.shared_schema import PdfAttachmentOutput
from app.core.config import settings
from app.schemas.common import BaseSchema
from app.services.chat_stream_protocol import ChatAgentAttachmentInput

logger = structlog.get_logger(__name__)

# Tool names that trigger invisible skill-loading semantics in the stream mapper.
_SKILL_LOADER_TOOL_NAMES = {"loadSkill", "load_skill"}


def _try_import_pydantic_ai_skills():
    """Lazy import pydantic-ai-skills to avoid hard dependency in custom runtime."""
    try:
        from pydantic_ai_skills import SkillsToolset

        return SkillsToolset
    except ImportError:
        return None


class ChatAgentError(Exception):
    """Raised when chat agent execution fails."""


@dataclass(slots=True, frozen=True)
class ChatAgentDeps:
    organization_id: str
    user_id: str
    thread_id: str
    run_id: str
    request_id: str | None = None
    attachments: tuple[ChatAgentAttachmentInput, ...] = ()
    persist_attachment: Callable[..., Any] | None = None
    upload_bytes: Callable[..., Any] | None = None


def _skill_load_log_context(deps: ChatAgentDeps | None) -> dict[str, Any]:
    """Build correlation context for skill-load logs from ChatAgentDeps."""
    ctx: dict[str, Any] = {}
    if deps is not None:
        if deps.request_id is not None:
            ctx["request_id"] = deps.request_id
        ctx["run_id"] = deps.run_id
        ctx["thread_id"] = deps.thread_id
        ctx["organization_id"] = deps.organization_id
        ctx["user_id"] = deps.user_id
    return ctx


def _stream_tool_log_context(deps: ChatAgentDeps) -> dict[str, Any]:
    """Build correlation context for stream tool-event logs."""
    ctx: dict[str, Any] = {
        "run_id": deps.run_id,
        "thread_id": deps.thread_id,
        "organization_id": deps.organization_id,
        "user_id": deps.user_id,
    }
    if deps.request_id is not None:
        ctx["request_id"] = deps.request_id
    return ctx


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

_CHAT_AGENT_REQUEST_LIMIT = 10
_CHAT_AGENT_TOOL_CALLS_LIMIT = 20
_CHAT_AGENT_RESPONSE_TOKENS_LIMIT = 32768

_CHAT_AGENT_USAGE_LIMITS = UsageLimits(
    request_limit=_CHAT_AGENT_REQUEST_LIMIT,
    tool_calls_limit=_CHAT_AGENT_TOOL_CALLS_LIMIT,
    response_tokens_limit=_CHAT_AGENT_RESPONSE_TOKENS_LIMIT,
)


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


async def _load_skill_tool_impl(
    ctx: RunContext[ChatAgentDeps],
    name: str,
) -> dict[str, str]:
    """Load a skill's full instructions by name.

    Validates the skill exists among discovered skills, loads its body with
    frontmatter stripped, and returns a safe structured result. No filesystem
    access outside the skills directory.
    """
    from app.agents.chat_skill_loader import discover_skills, load_skill

    log_ctx = _skill_load_log_context(ctx.deps)
    logger.info("chat_agent_skill_load_started", skill_name=name, runtime="custom", **log_ctx)
    start = time.perf_counter()

    available = {m.name for m in discover_skills()}
    if name not in available:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.error(
            "chat_agent_skill_load_failed",
            skill_name=name,
            duration_ms=duration_ms,
            runtime="custom",
            error="Unknown skill",
            **log_ctx,
        )
        raise ModelRetry("Unknown skill. Use one of the skills listed in Available Skills.")

    try:
        skill = load_skill(name)
    except ValueError as exc:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.error(
            "chat_agent_skill_load_failed",
            skill_name=name,
            duration_ms=duration_ms,
            runtime="custom",
            error=str(exc),
            **log_ctx,
        )
        raise ModelRetry(
            "Skill could not be loaded. Use a valid skill name from Available Skills."
        ) from exc

    duration_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        "chat_agent_skill_load_completed",
        skill_name=name,
        duration_ms=duration_ms,
        runtime="custom",
        **log_ctx,
    )
    return {
        "skill_name": skill.name,
        "content": skill.body,
    }


def _try_instrument_load_skill(agent: Agent, runtime: str) -> None:
    """Wrap the loadSkill tool function_schema.function with structured logging.

    Pydantic AI executes tools via ``function_schema.call``, which reads
    ``self.function`` at runtime. Mutating ``tool.function`` alone does NOT
    hook the real execution path, so we target ``tool.function_schema.function``
    instead. This is a best-effort instrumentation; if the schema is immutable
    or the function is not accessible, it silently skips.
    """
    toolset = getattr(agent, "_function_toolset", None)
    if toolset is None:
        return
    tools = getattr(toolset, "tools", None)
    if not isinstance(tools, dict):
        return
    tool = tools.get("loadSkill")
    if tool is None:
        return

    function_schema = getattr(tool, "function_schema", None)
    original = getattr(function_schema, "function", None) if function_schema is not None else None
    if original is None or not callable(original):
        return

    async def _wrapped(*args: Any, **kwargs: Any) -> Any:
        ctx = args[0] if args else None
        skill_name = kwargs.get("name") or kwargs.get("skill_name", "")
        if not skill_name and len(args) > 1:
            skill_name = args[1]

        deps = getattr(ctx, "deps", None) if ctx is not None else None
        log_ctx = _skill_load_log_context(deps if isinstance(deps, ChatAgentDeps) else None)

        logger.info(
            "chat_agent_skill_load_started",
            skill_name=skill_name or "unknown",
            runtime=runtime,
            **log_ctx,
        )
        start = time.perf_counter()

        try:
            result = await original(*args, **kwargs)
            duration_ms = int((time.perf_counter() - start) * 1000)
            logger.info(
                "chat_agent_skill_load_completed",
                skill_name=skill_name or "unknown",
                duration_ms=duration_ms,
                runtime=runtime,
                **log_ctx,
            )
            return result
        except Exception as exc:
            duration_ms = int((time.perf_counter() - start) * 1000)
            error_type = type(exc).__name__
            error_message = str(exc)[:200]
            logger.error(
                "chat_agent_skill_load_failed",
                skill_name=skill_name or "unknown",
                duration_ms=duration_ms,
                runtime=runtime,
                error_type=error_type,
                error_message=error_message,
                **log_ctx,
            )
            raise

    try:
        function_schema.function = _wrapped  # type: ignore[misc]
    except (AttributeError, TypeError):
        logger.warning(
            "chat_agent_skill_load_instrumentation_skipped",
            runtime=runtime,
            reason="function_schema_not_mutable",
        )


def _compile_chat_agent_instructions() -> tuple[str, str]:
    """Compile base instructions and return (instructions, prompt_hash)."""
    from app.agents.chat_skill_loader import compile_base_instructions

    instructions = compile_base_instructions()
    prompt_hash = hashlib.sha256(instructions.encode("utf-8")).hexdigest()[:16]
    return instructions, prompt_hash


def _register_tools(agent: Agent) -> None:
    """Register all tools on the agent instance.

    Skill loading is runtime-swappable via ``CHAT_SKILLS_RUNTIME``:
    - ``pydantic-ai-skills`` (default, recommended): uses ``SkillsToolset``
      from the third-party library, excluding scripts and resources for
      security.  The library's ``load_skill`` is renamed to ``loadSkill``
      so the stream mapper and prompt semantics stay unchanged.
    - ``custom``: uses the in-house ``loadSkill`` tool backed by
      ``chat_skill_loader.py``.  Keep this as a fallback if the third-party
      dependency is unavailable or a rollback is required.
    """
    if settings.CHAT_SKILLS_RUNTIME == "pydantic-ai-skills":
        SkillsToolset = _try_import_pydantic_ai_skills()
        if SkillsToolset is None:
            raise ChatAgentError(
                "CHAT_SKILLS_RUNTIME=pydantic-ai-skills but pydantic-ai-skills is not installed"
            )
        skills_path = Path(__file__).parent.parent / "prompts" / "chat-skills"
        toolset = SkillsToolset(
            directories=[skills_path],
            exclude_tools={"run_skill_script", "read_skill_resource"},
        )
        for tool in toolset.tools.values():
            if tool.name == "load_skill":
                tool.name = "loadSkill"
            agent._function_toolset.add_tool(tool)
        _try_instrument_load_skill(agent, "pydantic-ai-skills")
    else:

        @agent.tool(name="loadSkill")
        async def load_skill_tool(
            ctx: RunContext[ChatAgentDeps],
            name: str,
        ) -> dict[str, str]:
            """Load a skill's full instructions by name.

            Call this before performing specialized work. The available skills list
            is shown in the base instructions. Returns the skill's full content.
            """
            return await _load_skill_tool_impl(ctx, name)

    @agent.tool(name="generateIdeationBrief", timeout=120)
    async def generate_ideation_brief(
        ctx: RunContext[ChatAgentDeps],
        payload: IdeationBriefPayload,
    ) -> PdfAttachmentOutput:
        """Generate an Ideation Brief PDF.

        Tool args are flat top-level fields, e.g. {"customer": "Acme", ...}; do not pass {"payload": {...}}.
        """
        from app.services.pdf_renderer import render_ideation_brief

        return await _upload_pdf(
            ctx,
            payload=payload,
            renderer=render_ideation_brief,
            filename_suffix="ideation-brief",
            tool_name="generateIdeationBrief",
        )

    @agent.tool(name="generateAnalyticalRead", timeout=120)
    async def generate_analytical_read(
        ctx: RunContext[ChatAgentDeps],
        payload: AnalyticalReadPayload,
    ) -> PdfAttachmentOutput:
        """Generate an Analytical Read PDF.

        Tool args are flat top-level fields, e.g. {"customer": "Acme", ...}; do not pass {"payload": {...}}.
        """
        from app.services.pdf_renderer import render_analytical_read

        return await _upload_pdf(
            ctx,
            payload=payload,
            renderer=render_analytical_read,
            filename_suffix="analytical-read",
            tool_name="generateAnalyticalRead",
        )

    @agent.tool(name="generatePlaybook", timeout=120)
    async def generate_playbook(
        ctx: RunContext[ChatAgentDeps],
        payload: PlaybookPayload,
    ) -> PdfAttachmentOutput:
        """Generate a Discovery Playbook PDF.

        Tool args are flat top-level fields, e.g. {"customer": "Acme", ...}; do not pass {"payload": {...}}.
        """
        from app.services.pdf_renderer import render_playbook

        return await _upload_pdf(
            ctx,
            payload=payload,
            renderer=render_playbook,
            filename_suffix="playbook",
            tool_name="generatePlaybook",
        )


def _make_agent(*, instructions: str) -> Agent[ChatAgentDeps, str]:
    agent: Agent[ChatAgentDeps, str] = Agent(
        BedrockConverseModel(
            _BEDROCK_MODEL_NAME,
            provider=BedrockProvider(region_name=settings.AWS_REGION),
        ),
        deps_type=ChatAgentDeps,
        output_type=str,
        retries=2,
        tool_timeout=30,
        model_settings=BedrockModelSettings(
            max_tokens=32768,
            bedrock_cache_instructions=True,
            bedrock_cache_tool_definitions=True,
        ),
        instructions=instructions,
    )

    _register_tools(agent)
    return agent


@functools.lru_cache(maxsize=4)
def get_chat_agent() -> Agent[ChatAgentDeps, str]:
    """Return a cached chat agent instance keyed by compiled instructions hash.

    The cache is bounded (maxsize=4) to prevent unbounded growth if prompts
    change frequently in development or testing.
    """
    instructions, _ = _compile_chat_agent_instructions()
    return _make_agent(instructions=instructions)


def clear_chat_agent_cache() -> None:
    """Clear the chat agent LRU cache. Useful in tests and development."""
    get_chat_agent.cache_clear()


def get_chat_agent_prompt_hash() -> str:
    """Return the prompt hash for the current compiled instructions."""
    _, prompt_hash = _compile_chat_agent_instructions()
    return prompt_hash


async def generate_chat_response(
    *,
    prompt: str | list[str | UserContent],
    deps: ChatAgentDeps,
) -> ChatAgentOutput:
    """Run the chat agent with typed dependencies and validated output."""
    available_skills = available_skill_names()
    prompt_hash = get_chat_agent_prompt_hash()
    agent = get_chat_agent()
    logger.info(
        "chat_agent_run_started",
        run_id=deps.run_id,
        request_id=deps.request_id,
        thread_id=deps.thread_id,
        organization_id=deps.organization_id,
        user_id=deps.user_id,
        available_skills=available_skills,
        attachment_count=len(deps.attachments),
        prompt_hash=prompt_hash,
    )
    try:
        result = await agent.run(prompt, deps=deps, usage_limits=_CHAT_AGENT_USAGE_LIMITS)
        return ChatAgentOutput(response_text=result.output.strip())
    except UsageLimitExceeded as exc:
        logger.error(
            "chat_agent_usage_limit_exceeded",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            request_id=deps.request_id,
            available_skills=available_skills,
            prompt_hash=prompt_hash,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent usage limit exceeded") from exc
    except ValidationError as exc:
        logger.error(
            "chat_agent_result_validation_failed",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            request_id=deps.request_id,
            available_skills=available_skills,
            prompt_hash=prompt_hash,
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
            request_id=deps.request_id,
            available_skills=available_skills,
            prompt_hash=prompt_hash,
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
    runtime_input = _build_runtime_user_content(prompt=prompt, attachments=attachments)
    accumulated_text = ""
    tool_call_ids_by_index: dict[int, str] = {}
    tool_names_by_call_id: dict[str, str] = {}
    tools_called: list[dict[str, str]] = []
    pending_tool_call_batch: list[dict[str, str]] = []
    agent_status_active = False
    available_skills = available_skill_names()
    prompt_hash = get_chat_agent_prompt_hash()
    agent = get_chat_agent()

    def _flush_tool_call_batch() -> None:
        nonlocal pending_tool_call_batch
        if not pending_tool_call_batch:
            return
        logger.info(
            "chat_agent_tool_call_batch",
            **_stream_tool_log_context(deps),
            batch_size=len(pending_tool_call_batch),
            tool_names=[call["tool_name"] for call in pending_tool_call_batch],
            tool_call_ids=[call["tool_call_id"] for call in pending_tool_call_batch],
        )
        pending_tool_call_batch = []

    logger.info(
        "chat_agent_run_started",
        run_id=deps.run_id,
        request_id=deps.request_id,
        thread_id=deps.thread_id,
        organization_id=deps.organization_id,
        user_id=deps.user_id,
        available_skills=available_skills,
        attachment_count=len(attachments),
        prompt_hash=prompt_hash,
    )
    try:
        async for event in agent.run_stream_events(
            runtime_input, deps=deps, usage_limits=_CHAT_AGENT_USAGE_LIMITS
        ):
            if isinstance(event, AgentRunResultEvent):
                _flush_tool_call_batch()
                response_text = accumulated_text.strip() or str(event.result.output).strip()
                yield {"event": "completed", "response_text": response_text}
                return

            if isinstance(event, PartStartEvent) and isinstance(event.part, ToolCallPart):
                tool_call_ids_by_index[event.index] = event.part.tool_call_id
                tool_names_by_call_id[event.part.tool_call_id] = event.part.tool_name
                started_kwargs: dict[str, Any] = {
                    **_stream_tool_log_context(deps),
                    "tool_name": event.part.tool_name,
                    "tool_call_id": event.part.tool_call_id,
                }
                if event.part.tool_name in _SKILL_LOADER_TOOL_NAMES:
                    try:
                        args = event.part.args
                        if isinstance(args, dict):
                            skill_name = args.get("name") or args.get("skill_name")
                            if skill_name:
                                started_kwargs["skill_name"] = skill_name
                    except Exception:
                        pass
                logger.info("chat_agent_tool_started", **started_kwargs)
                tools_called.append(
                    {"tool_name": event.part.tool_name, "tool_call_id": event.part.tool_call_id}
                )
                pending_tool_call_batch.append(
                    {"tool_name": event.part.tool_name, "tool_call_id": event.part.tool_call_id}
                )
                if event.part.tool_name in _SKILL_LOADER_TOOL_NAMES:
                    agent_status_active = True
                    yield {
                        "event": "agent-status",
                        "phase": "preparing-analysis",
                        "label": "Preparing analysis...",
                    }
                elif event.part.tool_name in _PDF_TOOL_NAMES and agent_status_active:
                    agent_status_active = False
                    yield {
                        "event": "agent-status",
                        "phase": "idle",
                        "label": "",
                    }
                yield {
                    "event": "tool-input-start",
                    "toolCallId": event.part.tool_call_id,
                    "toolName": event.part.tool_name,
                }
                continue

            _flush_tool_call_batch()

            if isinstance(event, PartStartEvent) and isinstance(event.part, TextPart):
                initial = event.part.content
                if initial:
                    if agent_status_active:
                        agent_status_active = False
                        yield {"event": "agent-status", "phase": "idle", "label": ""}
                    accumulated_text += initial
                    yield {"event": "delta", "delta": initial}
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
                try:
                    tool_input = event.part.args_as_dict()
                except Exception as parse_exc:
                    logger.warning(
                        "chat_agent_tool_input_parse_failed",
                        run_id=deps.run_id,
                        tool_name=event.part.tool_name,
                        tool_call_id=event.part.tool_call_id,
                        error=str(parse_exc),
                    )
                    tool_input = {}
                yield {
                    "event": "tool-input-available",
                    "toolCallId": event.part.tool_call_id,
                    "toolName": event.part.tool_name,
                    "input": tool_input,
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
                    completed_kwargs: dict[str, Any] = {
                        **_stream_tool_log_context(deps),
                        "tool_name": event.result.tool_name,
                        "tool_call_id": event.result.tool_call_id,
                    }
                    if event.result.tool_name in _SKILL_LOADER_TOOL_NAMES:
                        # Skill bodies are internal operating instructions. They are
                        # returned to the model as tool output, but must never be
                        # forwarded to the client stream. Emit a sanitized status-only
                        # event so the UI can show the skill was loaded without leaking
                        # the body content.
                        output_object = event.result.model_response_object()
                        skill_name_for_log = ""
                        if isinstance(output_object, dict):
                            skill_name_for_log = output_object.get("skill_name", "")
                            if not skill_name_for_log:
                                # pydantic-ai-skills runtime wraps the XML string in
                                # return_value when emitted as a ToolReturnPart.
                                return_value = output_object.get("return_value", "")
                                if isinstance(return_value, str):
                                    match = re.search(r"<name>([^<]+)</name>", return_value)
                                    if match:
                                        skill_name_for_log = match.group(1)
                        elif isinstance(output_object, str):
                            # pydantic-ai-skills runtime returns XML string
                            match = re.search(r"<name>([^<]+)</name>", output_object)
                            if match:
                                skill_name_for_log = match.group(1)
                        if skill_name_for_log:
                            completed_kwargs["skill_name"] = skill_name_for_log
                        yield {
                            "event": "tool-output-available",
                            "toolCallId": event.result.tool_call_id,
                            "output": {"skill_name": skill_name_for_log, "status": "loaded"},
                        }
                        logger.info("chat_agent_tool_completed", **completed_kwargs)
                        continue
                    logger.info("chat_agent_tool_completed", **completed_kwargs)
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
                    if agent_status_active:
                        agent_status_active = False
                        yield {"event": "agent-status", "phase": "idle", "label": ""}
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
            request_id=deps.request_id,
            available_skills=available_skills,
            tools_called=tools_called,
        )
        raise
    except UsageLimitExceeded as exc:
        logger.error(
            "chat_agent_stream_usage_limit_exceeded",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            request_id=deps.request_id,
            available_skills=available_skills,
            tools_called=tools_called,
            prompt_hash=prompt_hash,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent usage limit exceeded") from exc
    except ChatAgentError:
        raise
    except Exception as exc:
        logger.error(
            "chat_agent_stream_failed",
            organization_id=deps.organization_id,
            user_id=deps.user_id,
            thread_id=deps.thread_id,
            run_id=deps.run_id,
            request_id=deps.request_id,
            available_skills=available_skills,
            tools_called=tools_called,
            prompt_hash=prompt_hash,
            error=str(exc),
        )
        raise ChatAgentError("Chat agent streaming failed") from exc
