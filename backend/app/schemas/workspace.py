"""Schemas for workspace v1 backend contract."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_serializer, field_validator, model_validator

from app.schemas.common import BaseSchema

WorkspaceBaseFieldId = Literal[
    "material_type",
    "material_name",
    "composition",
    "volume",
    "frequency",
]
WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS = 50


class WorkspaceBaseFieldItem(BaseSchema):
    field_id: WorkspaceBaseFieldId
    label: str
    value: str
    required: bool = True
    is_filled: bool


class WorkspaceBaseFieldUpdateItem(BaseSchema):
    field_id: WorkspaceBaseFieldId
    value: str


class WorkspaceBaseFieldUpdateRequest(BaseSchema):
    base_fields: list[WorkspaceBaseFieldUpdateItem] = Field(min_length=1, max_length=5)


class WorkspaceCustomFieldUpdateItem(BaseSchema):
    id: str = Field(min_length=1, max_length=200)
    label: str = Field(min_length=1, max_length=120)
    answer: str = Field(min_length=1, max_length=2000)

    @field_validator("id", "label", "answer")
    @classmethod
    def validate_trimmed_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed


class WorkspaceCustomFieldUpdateRequest(BaseSchema):
    custom_fields: list[WorkspaceCustomFieldUpdateItem] = Field(min_length=1, max_length=200)


class WorkspaceQuestionAnswerUpdateItem(BaseSchema):
    question_id: str = Field(pattern=r"^q([1-9]|[12][0-9]|3[01])$")
    value: str = Field(max_length=2000)

    @field_validator("value")
    @classmethod
    def validate_trimmed_value(cls, value: str) -> str:
        return value.strip()


class WorkspaceQuestionnaireUpdateRequest(BaseSchema):
    answers: list[WorkspaceQuestionAnswerUpdateItem] = Field(min_length=1, max_length=31)


class WorkspaceEvidenceRef(BaseSchema):
    file_id: UUID
    filename: str
    page: int | None = Field(default=None, ge=1)
    excerpt: str | None = Field(default=None, max_length=500)


class WorkspaceProposalItem(BaseSchema):
    temp_id: str = Field(min_length=1, max_length=64)
    target_kind: Literal["base_field", "custom_field"]
    base_field_id: WorkspaceBaseFieldId | None = None
    existing_custom_field_id: str | None = None
    proposed_label: str = Field(min_length=1, max_length=120)
    proposed_answer: str = Field(min_length=1, max_length=2000)
    selected: bool = True
    evidence_refs: list[WorkspaceEvidenceRef] = Field(min_length=1)
    confidence: int | None = Field(default=None, ge=0, le=100)

    @field_validator("temp_id", "proposed_label", "proposed_answer")
    @classmethod
    def validate_trimmed_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed

    @model_validator(mode="after")
    def validate_target_consistency(self) -> "WorkspaceProposalItem":
        if self.target_kind == "base_field" and self.base_field_id is None:
            raise ValueError("base_field proposals require base_field_id")
        if self.target_kind == "base_field" and self.existing_custom_field_id is not None:
            raise ValueError("base_field proposals cannot include existing_custom_field_id")
        if self.target_kind == "custom_field" and self.base_field_id is not None:
            raise ValueError("custom_field proposals cannot include base_field_id")
        return self


class WorkspaceProposalBatch(BaseSchema):
    batch_id: str = Field(min_length=1, max_length=64)
    proposals: list[WorkspaceProposalItem] = Field(
        default_factory=list,
        max_length=WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS,
    )
    generated_at: datetime

    @field_serializer("generated_at")
    def serialize_generated_at(self, dt: datetime) -> str:
        return _serialize_canonical_datetime(dt)


class WorkspaceCustomFieldItem(BaseSchema):
    id: str
    label: str
    answer: str
    created_at: datetime
    created_by: Literal["ai_confirmed"]
    evidence_refs: list[WorkspaceEvidenceRef] = Field(default_factory=list)
    confidence: int | None = Field(default=None, ge=0, le=100)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return _serialize_canonical_datetime(dt)


class WorkspaceEvidenceItem(BaseSchema):
    id: UUID
    filename: str
    category: str
    processing_status: Literal["queued", "processing", "completed", "failed"]
    uploaded_at: datetime
    summary: str | None = None
    facts: list[str] = Field(default_factory=list)
    processing_error: str | None = None

    @field_serializer("uploaded_at")
    def serialize_uploaded_at(self, dt: datetime) -> str:
        return _serialize_canonical_datetime(dt)


class WorkspaceReadiness(BaseSchema):
    is_ready: bool
    missing_base_fields: list[str] = Field(default_factory=list)


WorkspaceQuestionSuggestionStatus = Literal["pending", "rejected"]


class WorkspaceQuestionSuggestionItem(BaseSchema):
    question_id: str = Field(pattern=r"^q([1-9]|[12][0-9]|3[01])$")
    suggested_value: str = Field(min_length=1, max_length=2000)
    status: WorkspaceQuestionSuggestionStatus = "pending"
    phase: Literal[1, 2, 3, 4]
    section: str = Field(min_length=1, max_length=120)
    evidence_refs: list[WorkspaceEvidenceRef] = Field(default_factory=list)
    confidence: int | None = Field(default=None, ge=0, le=100)
    updated_at: datetime
    has_conflict: bool = False
    confirmed_answer: str | None = None

    @field_validator("suggested_value", "section")
    @classmethod
    def validate_trimmed_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed

    @field_validator("confirmed_answer")
    @classmethod
    def validate_confirmed_answer(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> str:
        return _serialize_canonical_datetime(dt)


class WorkspaceDerivedInsights(BaseSchema):
    summary: str | None = None
    facts: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    information_coverage: int = Field(ge=0, le=100)
    readiness: WorkspaceReadiness
    last_refreshed_at: datetime | None = None

    @field_serializer("last_refreshed_at")
    def serialize_last_refreshed_at(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        return _serialize_canonical_datetime(dt)


class WorkspaceHydrateResponse(BaseSchema):
    project_id: UUID
    base_fields: list[WorkspaceBaseFieldItem]
    custom_fields: list[WorkspaceCustomFieldItem]
    evidence_items: list[WorkspaceEvidenceItem]
    context_note: str | None = None
    questionnaire_answers: dict[str, str] = Field(default_factory=dict)
    questionnaire_suggestions: list[WorkspaceQuestionSuggestionItem] = Field(
        default_factory=list
    )
    phase_progress: dict[str, bool] = Field(default_factory=dict)
    first_incomplete_phase: Literal[1, 2, 3, 4] = 1
    derived: WorkspaceDerivedInsights


class WorkspaceContextNoteUpdateRequest(BaseSchema):
    text: str


class WorkspaceContextNoteUpdateResponse(BaseSchema):
    text: str
    updated_at: datetime

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> str:
        return _serialize_canonical_datetime(dt)


class WorkspaceRefreshInsightsResponse(BaseSchema):
    derived: WorkspaceDerivedInsights
    proposal_batch: WorkspaceProposalBatch
    questionnaire_suggestions: list[WorkspaceQuestionSuggestionItem] = Field(
        default_factory=list
    )


class WorkspaceQuestionSuggestionReviewScope(BaseSchema):
    kind: Literal["field", "section", "phase"]
    question_id: str | None = Field(default=None, pattern=r"^q([1-9]|[12][0-9]|3[01])$")
    section: str | None = Field(default=None, max_length=120)
    phase: Literal[1, 2, 3, 4] | None = None

    @field_validator("section")
    @classmethod
    def validate_optional_section(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("section must not be empty")
        return trimmed

    @model_validator(mode="after")
    def validate_scope(self) -> "WorkspaceQuestionSuggestionReviewScope":
        if self.kind == "field":
            if self.question_id is None:
                raise ValueError("field scope requires question_id")
            if self.section is not None or self.phase is not None:
                raise ValueError("field scope accepts only question_id")
            return self

        if self.kind == "section":
            if self.section is None:
                raise ValueError("section scope requires section")
            if self.question_id is not None or self.phase is not None:
                raise ValueError("section scope accepts only section")
            return self

        if self.phase is None:
            raise ValueError("phase scope requires phase")
        if self.question_id is not None or self.section is not None:
            raise ValueError("phase scope accepts only phase")
        return self


class WorkspaceQuestionSuggestionReviewRequest(BaseSchema):
    action: Literal["accept", "reject"]
    scope: WorkspaceQuestionSuggestionReviewScope


class WorkspaceQuestionSuggestionReviewResponse(BaseSchema):
    processed_count: int = Field(ge=0)
    ignored_question_ids: list[str] = Field(default_factory=list)
    workspace: WorkspaceHydrateResponse


class WorkspaceConfirmProposalEditItem(BaseSchema):
    temp_id: str = Field(min_length=1, max_length=64)
    selected: bool = True
    proposed_label: str | None = Field(default=None, max_length=120)
    proposed_answer: str | None = Field(default=None, max_length=2000)

    @field_validator("temp_id")
    @classmethod
    def validate_temp_id_trimmed_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("value must not be empty")
        return trimmed

    @field_validator("proposed_label", "proposed_answer")
    @classmethod
    def validate_optional_trimmed_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()


class WorkspaceConfirmProposalRequest(BaseSchema):
    batch_id: str = Field(min_length=1, max_length=64)
    proposals: list[WorkspaceConfirmProposalEditItem] = Field(
        default_factory=list,
        max_length=WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS,
    )


class WorkspaceConfirmProposalResponse(BaseSchema):
    created_fields: list[WorkspaceCustomFieldItem]
    ignored_temp_ids: list[str]
    workspace: WorkspaceHydrateResponse


def _serialize_canonical_datetime(dt: datetime) -> str:
    dt_utc = dt.astimezone(UTC)
    ms = dt_utc.microsecond // 1000
    dt_ms = dt_utc.replace(microsecond=ms * 1000)
    return dt_ms.strftime("%Y-%m-%dT%H:%M:%S") + f".{ms:03d}Z"
