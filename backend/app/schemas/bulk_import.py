"""Schemas for bulk import APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import BaseSchema

RunStatus = Literal[
    "uploaded",
    "processing",
    "review_ready",
    "finalizing",
    "completed",
    "failed",
    "no_data",
]
ItemStatus = Literal["pending_review", "accepted", "amended", "rejected", "invalid"]
ItemType = Literal["location", "project"]
RunSourceType = Literal["bulk_import", "voice_interview"]


class BulkImportUploadResponse(BaseSchema):
    run_id: UUID
    status: RunStatus


class BulkImportRunResponse(BaseSchema):
    id: UUID
    entrypoint_type: Literal["organization", "company", "location"]
    entrypoint_id: UUID
    source_filename: str
    source_type: RunSourceType
    status: RunStatus
    progress_step: str | None = None
    processing_error: str | None = None
    total_items: int
    accepted_count: int
    rejected_count: int
    amended_count: int
    invalid_count: int
    duplicate_count: int
    created_by_user_id: UUID | None = None
    finalized_by_user_id: UUID | None = None
    finalized_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    voice_interview_id: UUID | None = None
    discovery_source_type: Literal["file", "audio", "text"] | None = None


class BulkImportItemResponse(BaseSchema):
    id: UUID
    run_id: UUID
    item_type: ItemType
    status: ItemStatus
    needs_review: bool
    confidence: int | None
    extracted_data: dict[str, object]
    normalized_data: dict[str, object]
    user_amendments: dict[str, object] | None = None
    review_notes: str | None = None
    duplicate_candidates: list[dict[str, object]] | None = None
    confirm_create_new: bool
    parent_item_id: UUID | None = None
    created_location_id: UUID | None = None
    created_project_id: UUID | None = None
    group_id: str | None = None
    created_at: datetime
    updated_at: datetime


class BulkImportLocationResolutionLocked(BaseSchema):
    mode: Literal["locked"]
    name: str = Field(min_length=1, max_length=255)


class BulkImportLocationResolutionExisting(BaseSchema):
    mode: Literal["existing"]
    location_id: UUID


class BulkImportLocationResolutionCreateNew(BaseSchema):
    mode: Literal["create_new"]
    name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=500)


BulkImportLocationResolution = Annotated[
    BulkImportLocationResolutionLocked
    | BulkImportLocationResolutionExisting
    | BulkImportLocationResolutionCreateNew,
    Field(discriminator="mode"),
]


class BulkImportCompanyResolutionExisting(BaseSchema):
    mode: Literal["existing"]
    company_id: UUID


class BulkImportCompanyResolutionCreateNew(BaseSchema):
    mode: Literal["create_new"]
    name: str = Field(min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=100)
    sector: str | None = Field(default=None, max_length=50)
    subsector: str | None = Field(default=None, max_length=100)


BulkImportCompanyResolution = Annotated[
    BulkImportCompanyResolutionExisting | BulkImportCompanyResolutionCreateNew,
    Field(discriminator="mode"),
]


class BulkImportItemPatchRequest(BaseSchema):
    action: Literal["accept", "amend", "reject", "reset"]
    normalized_data: dict[str, object] | None = None
    review_notes: str | None = Field(default=None, max_length=1000)
    location_resolution: BulkImportLocationResolution | None = None
    confirm_create_new: bool | None = None

    @model_validator(mode="after")
    def validate_amend_payload(self) -> BulkImportItemPatchRequest:
        if (
            self.action == "amend"
            and self.normalized_data is None
            and self.location_resolution is None
        ):
            raise ValueError("normalized_data or location_resolution required for amend")
        return self


class BulkImportFinalizeSummary(BaseSchema):
    run_id: UUID
    locations_created: int
    projects_created: int
    rejected: int
    invalid: int
    duplicates_resolved: int


class BulkImportFinalizeResponse(BaseSchema):
    status: RunStatus
    summary: BulkImportFinalizeSummary


class BulkImportFinalizeRequest(BaseSchema):
    resolved_group_ids: list[str] = Field(default_factory=list)
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=128)
    close_reason: Literal["empty_extraction"] | None = None

    @model_validator(mode="after")
    def validate_close_reason_contract(self) -> BulkImportFinalizeRequest:
        if self.close_reason == "empty_extraction":
            return self
        if not self.resolved_group_ids:
            raise ValueError("resolved_group_ids required unless close_reason=empty_extraction")
        if not self.idempotency_key:
            raise ValueError("idempotency_key required unless close_reason=empty_extraction")
        return self


class BulkImportDiscoveryDraftDecisionRequest(BaseSchema):
    action: Literal["confirm", "reject"]
    normalized_data: dict[str, object] | None = None
    review_notes: str | None = Field(default=None, max_length=1000)
    company_resolution: BulkImportCompanyResolution | None = None
    location_resolution: BulkImportLocationResolution | None = None
    confirm_create_new: bool | None = None
    owner_user_id: UUID | None = None


class BulkImportDiscoveryDraftDecisionResponse(BaseSchema):
    status: RunStatus
    summary: BulkImportFinalizeSummary
    item: BulkImportItemResponse


class BulkImportSummaryResponse(BaseSchema):
    summary: BulkImportFinalizeSummary


class BulkImportRunLocationOption(BaseSchema):
    id: UUID
    name: str
    city: str
    state: str
    address: str | None = None


class AssignOrphansRequest(BaseSchema):
    location_id: UUID
    item_ids: list[UUID]


class AssignOrphansResponse(BaseSchema):
    projects_created: int
    created_project_ids: dict[str, str]  # item_id → project_id
    skipped: int = 0
