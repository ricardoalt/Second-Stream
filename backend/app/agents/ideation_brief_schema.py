from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.agents.base_pdf_schema import BasePdfPayload
from app.agents.shared_schema import PdfAttachmentOutput as PDFOutput  # noqa: F401


class IdeationSection(BaseModel):
    title: str
    lead: str
    body: str
    emphasis: Literal["insight", "caution", "gap"] | None = None
    close: str | None = None


class IdeationBriefPayload(BasePdfPayload):
    gate_status: Literal["OPEN", "OPEN_CONDITIONAL", "CLOSED"]
    gate_blocker: str | None = None
    sections: list[IdeationSection]
    strategic_insight: str
    markers_used: list[Literal["insight", "caution", "gap"]] = Field(default_factory=list)
