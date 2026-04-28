from __future__ import annotations

from pydantic import BaseModel, Field

from app.agents.base_pdf_schema import BasePdfPayload
from app.agents.shared_schema import PdfAttachmentOutput as PDFOutput  # noqa: F401
from app.agents.shared_schema import SafetyFlag


class AnalyticalTable(BaseModel):
    title: str
    headers: list[str]
    rows: list[list[str]]


class AnalyticalReadPayload(BasePdfPayload):
    executive_summary: str
    safety_callouts: list[SafetyFlag] = Field(default_factory=list)
    tables: list[AnalyticalTable]
    strategic_insight: str
