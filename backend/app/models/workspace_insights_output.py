"""Structured output model for workspace insights refresh."""

import re
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema


class WorkspaceProposalEvidenceRef(BaseSchema):
    file_id: UUID
    page: int | None = Field(default=None, ge=1)
    excerpt: str | None = Field(default=None, max_length=500)


class WorkspaceProposalDraft(BaseSchema):
    proposed_label: str = Field(min_length=1, max_length=120)
    proposed_answer: str = Field(min_length=1, max_length=2000)
    confidence: int | None = Field(default=None, ge=0, le=100)
    evidence_refs: list[WorkspaceProposalEvidenceRef] = Field(min_length=1)

    _placeholder_answer_pattern = re.compile(
        r"\b(unknown|not\s+recorded|n/?a|none|tbd|not\s+provided)\b",
        re.IGNORECASE,
    )

    @field_validator("proposed_label", "proposed_answer")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed

    @field_validator("proposed_answer")
    @classmethod
    def reject_placeholder_answer(cls, value: str) -> str:
        if cls._placeholder_answer_pattern.search(value):
            raise ValueError("proposed_answer cannot be a placeholder")
        return value


class WorkspaceInsightsOutput(BaseSchema):
    summary: str = Field(min_length=1, max_length=2000)
    facts: list[str] = Field(default_factory=list, max_length=12)
    missing_info: list[str] = Field(default_factory=list, max_length=12)
    proposed_fields: list[WorkspaceProposalDraft] = Field(default_factory=list, max_length=12)
