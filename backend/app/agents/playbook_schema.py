from __future__ import annotations

from pydantic import BaseModel, Field

from app.agents.base_pdf_schema import BasePdfPayload
from app.agents.shared_schema import PdfAttachmentOutput as PDFOutput  # noqa: F401


class PlaybookTheme(BaseModel):
    number: int
    title: str
    body: str
    probe_questions: list[str] = Field(default_factory=list)
    why_it_matters: list[str] = Field(default_factory=list)


class PlaybookPayload(BasePdfPayload):
    opening_context: str = ""
    themes: list[PlaybookTheme]
