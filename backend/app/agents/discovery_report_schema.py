from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SafetyFlag(BaseModel):
    severity: Literal["stop", "specialist", "attention"]
    sub_stream: str
    description: str
    intervention: str | None = None


class ReportSection(BaseModel):
    title: str
    lead: str
    body: str
    close: str | None = None


class Question(BaseModel):
    question: str
    why_it_matters: str


class DiscoveryReportPayload(BaseModel):
    customer: str
    stream: str
    snapshot: str
    gate_status: Literal["OPEN", "OPEN_CONDITIONAL", "CLOSED"]
    gate_blocker: str | None = None
    safety_callouts: list[SafetyFlag]
    sections: list[ReportSection] = Field(min_length=8, max_length=8)
    killer_question: Question
    follow_up_questions: list[Question] = Field(default_factory=list)
    strategic_insight: str


class PdfAttachmentOutput(BaseModel):
    attachment_id: str
    filename: str
    download_url: str
    view_url: str
    expires_at: str  # ISO 8601
    size_bytes: int
