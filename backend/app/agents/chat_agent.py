"""Single chat agent wrapper for phase-1 chat responses."""

from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic import Field, ValidationError
from pydantic_ai import Agent
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.schemas.common import BaseSchema

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
    path = Path(__file__).parent.parent / "prompts" / "skills" / "chat" / filename
    content = path.read_text(encoding="utf-8").strip()
    if not content:
        raise ValueError(f"Prompt file is empty: {path}")
    return content


def load_chat_system_prompt() -> str:
    return _load_prompt_file("system.md")


def load_chat_attachment_policy_prompt() -> str:
    return _load_prompt_file("attachment-policy.md")


def build_chat_system_prompt() -> str:
    system_prompt = load_chat_system_prompt()
    attachment_policy = load_chat_attachment_policy_prompt()
    return f"{system_prompt}\n\n{attachment_policy}"


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
    system_prompt=build_chat_system_prompt(),
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
