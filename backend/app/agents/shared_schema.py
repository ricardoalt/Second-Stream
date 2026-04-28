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
    download_url: str | None = None
    view_url: str | None = None
    expires_at: str | None = None  # ISO 8601; None when resolved via persistent endpoint
    size_bytes: int
