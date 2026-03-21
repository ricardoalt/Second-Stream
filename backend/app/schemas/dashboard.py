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
ProposalFollowUpState = Literal[
    "uploaded",
    "waiting_to_send",
    "waiting_response",
    "under_negotiation",
    "accepted",
    "rejected",
]


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
    entrypoint_type: Literal["company", "location"]
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
    location_label: str | None = None
    volume_summary: str | None = None
    last_activity_at: datetime
    source_type: Literal["bulk_import", "voice_interview"]
    source_filename: str | None = None
    draft_status: Literal["pending_review", "accepted", "amended"]
    confidence: int | None = None
    draft_kind: DraftKind
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
