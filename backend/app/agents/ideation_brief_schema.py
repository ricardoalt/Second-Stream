from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.agents.base_pdf_schema import BasePdfPayload
from app.agents.shared_schema import PdfAttachmentOutput as PDFOutput  # noqa: F401
from app.agents.shared_schema import SafetyFlag


class IdeationSubSection(BaseModel):
    label: str | None = None
    title: str
    lead: str | None = None
    bullets: list[str] = Field(default_factory=list)
    body: str | None = None
    emphasis: Literal["insight", "caution", "gap"] | None = None


class IdeationSection(BaseModel):
    title: str
    lead: str | None = None
    body: str | None = None
    sub_sections: list[IdeationSubSection] = Field(default_factory=list)
    emphasis: Literal["insight", "caution", "gap"] | None = None
    close: str | None = None


class IdeationBriefPayload(BasePdfPayload):
    gate_status: Literal["OPEN", "OPEN_CONDITIONAL", "CLOSED"]
    gate_blocker: str | None = None
    gate_blockers: list[str] = Field(default_factory=list)
    safety_callouts: list[SafetyFlag] = Field(default_factory=list)
    sections: list[IdeationSection]
    strategic_insight: str
    markers_used: list[Literal["insight", "caution", "gap"]] = Field(default_factory=list)
