"""Dedicated dashboard schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import BaseSchema

DashboardBucket = Literal[
    "total",
    "needs_confirmation",
    "missing_information",
    "intelligence_report",
    "proposal",
]
DashboardRowKind = Literal["persisted_stream", "draft_item"]
DraftKind = Literal["linked", "orphan_stream", "location_only"]
DashboardQueuePriority = Literal["critical", "high", "normal"]
ProposalFollowUpState = Literal[
    "uploaded",
    "waiting_to_send",
    "waiting_response",
    "under_negotiation",
    "accepted",
    "rejected",
]

OfferPipelineState = Literal[
    "uploaded",
    "waiting_to_send",
    "waiting_response",
    "under_negotiation",
]

OfferArchiveState = Literal["accepted", "declined"]


class DashboardCountsResponse(BaseSchema):
    # Global cross-bucket totals for the current filter set.
    # Includes secondary drafts (location_only) as pending confirmation work.
    total: int
    needs_confirmation: int
    missing_information: int
    intelligence_report: int
    proposal: int


class PersistedStreamDashboardRow(BaseSchema):
    kind: Literal["persisted_stream"] = "persisted_stream"
    bucket: DashboardBucket
    project_id: UUID
    stream_name: str
    can_edit_proposal_follow_up: bool
    waste_category_label: str | None = None
    owner_display_name: str | None = None
    owner_user_id: UUID | None = None
    queue_priority: DashboardQueuePriority = "normal"
    queue_priority_reason: str = "normal"
    company_id: UUID | None = None
    company_label: str | None = None
    location_label: str | None = None
    archived_at: datetime | None = None
    volume_summary: str | None = None
    last_activity_at: datetime
    pending_confirmation: bool
    missing_required_info: bool
    missing_fields: list[str] = Field(default_factory=list)
    intelligence_ready: bool
    proposal_follow_up_state: ProposalFollowUpState | None = None

    @field_serializer("archived_at", "last_activity_at")
    def serialize_datetime(self, value: datetime | None, _info) -> str | None:
        return value.isoformat() if value else None


class DraftTargetResponse(BaseSchema):
    target_kind: Literal["confirmation_flow"]
    run_id: UUID
    item_id: UUID
    source_type: Literal["bulk_import", "voice_interview"]
    entrypoint_type: Literal["organization", "company", "location"]
    entrypoint_id: UUID


class DraftItemDashboardRow(BaseSchema):
    kind: Literal["draft_item"] = "draft_item"
    bucket: Literal["total", "needs_confirmation"]
    item_id: UUID
    run_id: UUID
    group_id: str | None = None
    stream_name: str
    company_id: UUID | None = None
    company_label: str | None = None
    suggested_company_label: str | None = None
    suggested_client_confidence: int | None = None
    suggested_client_evidence: list[str] = Field(default_factory=list)
    location_label: str | None = None
    suggested_location_name: str | None = None
    suggested_location_city: str | None = None
    suggested_location_state: str | None = None
    suggested_location_address: str | None = None
    suggested_location_confidence: int | None = None
    suggested_location_evidence: list[str] = Field(default_factory=list)
    volume: str | None = None
    frequency: str | None = None
    units: str | None = None
    volume_summary: str | None = None
    last_activity_at: datetime
    source_type: Literal["bulk_import", "voice_interview"]
    source_filename: str | None = None
    draft_status: Literal["pending_review", "accepted", "amended"]
    confidence: int | None = None
    draft_kind: DraftKind
    queue_priority: DashboardQueuePriority = "high"
    queue_priority_reason: str = "draft_needs_confirmation"
    confirmable: bool
    target: DraftTargetResponse | None = None

    @field_serializer("last_activity_at")
    def serialize_last_activity(self, value: datetime, _info) -> str:
        return value.isoformat()


class DashboardDraftPreviewSlice(BaseSchema):
    items: list[DraftItemDashboardRow]
    total: int


DashboardRow = Annotated[
    PersistedStreamDashboardRow | DraftItemDashboardRow,
    Field(discriminator="kind"),
]


class DashboardListResponse(BaseSchema):
    bucket: DashboardBucket
    counts: DashboardCountsResponse
    items: list[DashboardRow]
    # Paginated main-list total for active bucket (excludes secondary rows).
    total: int
    page: int
    size: int
    pages: int
    draft_preview: DashboardDraftPreviewSlice | None = None
    # Secondary rows (currently location_only drafts) shown outside main list.
    secondary_draft_rows: list[DraftItemDashboardRow] = Field(default_factory=list)


class ProposalFollowUpStateUpdateRequest(BaseSchema):
    state: ProposalFollowUpState


class ProposalFollowUpStateResponse(BaseSchema):
    project_id: UUID
    proposal_follow_up_state: ProposalFollowUpState
    updated_at: datetime

    @field_serializer("updated_at")
    def serialize_updated_at(self, value: datetime, _info) -> str:
        return value.isoformat()


class OfferPipelineCountsResponse(BaseSchema):
    total: int
    uploaded: int
    waiting_to_send: int
    waiting_response: int
    under_negotiation: int


class OfferPipelineRow(BaseSchema):
    project_id: UUID
    stream_name: str
    company_label: str | None = None
    location_label: str | None = None
    proposal_follow_up_state: OfferPipelineState
    latest_proposal_id: UUID | None = None
    latest_proposal_version: str | None = None
    latest_proposal_title: str | None = None
    value_usd: float | None = None
    last_activity_at: datetime

    @field_serializer("last_activity_at")
    def serialize_last_activity(self, value: datetime, _info) -> str:
        return value.isoformat()


class OfferPipelineResponse(BaseSchema):
    counts: OfferPipelineCountsResponse
    items: list[OfferPipelineRow]


class OfferArchiveCountsResponse(BaseSchema):
    total: int
    accepted: int
    declined: int


class OfferArchiveRow(BaseSchema):
    project_id: UUID
    stream_name: str
    company_label: str | None = None
    location_label: str | None = None
    proposal_follow_up_state: OfferArchiveState
    latest_proposal_id: UUID | None = None
    latest_proposal_version: str | None = None
    latest_proposal_title: str | None = None
    value_usd: float | None = None
    last_activity_at: datetime
    archived_at: datetime

    @field_serializer("last_activity_at", "archived_at")
    def serialize_last_activity(self, value: datetime, _info) -> str:
        return value.isoformat()


class OfferArchiveResponse(BaseSchema):
    counts: OfferArchiveCountsResponse
    items: list[OfferArchiveRow]
