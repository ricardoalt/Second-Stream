from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class SafetyFlag(BaseModel):
    severity: Literal["stop", "specialist", "attention"]
    sub_stream: str
    description: str
    intervention: str | None = None


class PdfAttachmentOutput(BaseModel):
    attachment_id: str
    filename: str
    download_url: str
    view_url: str
    expires_at: str  # ISO 8601
    size_bytes: int
