"""AI Agents for proposal generation, analysis, and chat."""

from app.agents.chat_agent import (
    ChatAgentDeps,
    ChatAgentError,
    ChatAgentOutput,
    chat_agent,
    generate_chat_response,
    stream_chat_response,
)
from app.agents.discovery_report_schema import (
    DiscoveryReportPayload,
    PdfAttachmentOutput,
)
from app.agents.image_analysis_agent import (
    ImageAnalysisError,
    analyze_image,
)
from app.agents.proposal_agent import (
    ProposalGenerationError,
    generate_enhanced_proposal,
)

__all__ = [
    "ChatAgentDeps",
    "ChatAgentError",
    "ChatAgentOutput",
    "DiscoveryReportPayload",
    "PdfAttachmentOutput",
    "ImageAnalysisError",
    "ProposalGenerationError",
    "analyze_image",
    "chat_agent",
    "generate_chat_response",
    "generate_enhanced_proposal",
    "stream_chat_response",
]
