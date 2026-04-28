from __future__ import annotations

from pydantic import BaseModel, Field

from app.agents.base_pdf_schema import BasePdfPayload
from app.agents.shared_schema import PdfAttachmentOutput as PDFOutput  # noqa: F401
from app.agents.shared_schema import SafetyFlag


class AnalyticalTable(BaseModel):
    title: str
    headers: list[str]
    rows: list[list[str]]


class EvidenceTag(BaseModel):
    tag: str = Field(description="Evidence handle, e.g. EV-01.")
    title: str
    description: str
    confidence: str | None = Field(default=None, description="HIGH, MEDIUM, LOW, or equivalent confidence language.")


class AnalyticalSection(BaseModel):
    title: str
    body: str = ""
    bullets: list[str] = Field(default_factory=list)


class GapItem(BaseModel):
    label: str
    detail: str


class GapSection(BaseModel):
    title: str = Field(description="Group label such as REQUIRED, NICE TO HAVE, or REGULATORY FLAG.")
    items: list[GapItem] = Field(default_factory=list)


class AnalyticalReadPayload(BasePdfPayload):
    executive_summary: str
    gate_status: str | None = Field(default=None, description="OPEN, CONDITIONALLY OPEN, CLOSED, or similar gate status.")
    gate_blockers: list[str] = Field(default_factory=list)
    safety_callouts: list[SafetyFlag] = Field(default_factory=list)
    tables: list[AnalyticalTable] = Field(
        default_factory=list,
        description="Ordered analytical tables such as chemistry matrix, treatment fit, buyer matrix, and sizing.",
    )
    evidence_tags: list[EvidenceTag] = Field(default_factory=list)
    narrative_sections: list[AnalyticalSection] = Field(
        default_factory=list,
        description="Ordered narrative sections such as phased commercial scenarios or routing logic.",
    )
    gap_sections: list[GapSection] = Field(default_factory=list)
    strategic_insight: str
