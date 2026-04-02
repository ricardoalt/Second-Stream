from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import BaseSchema
from app.schemas.user_fastapi import UserRead

ProposalFollowUpState = Literal[
    "uploaded",
    "waiting_to_send",
    "waiting_response",
    "under_negotiation",
    "accepted",
    "rejected",
]


class AgentDetailKPIs(BaseSchema):
    open_streams: int
    missing_information: int
    offers_in_progress: int
    completed_streams: int


class AgentDetailStreamRow(BaseSchema):
    project_id: UUID
    stream_name: str
    status: str
    company_label: str | None = None
    location_label: str | None = None
    last_activity_at: datetime
    missing_required_info: bool
    missing_fields: list[str] = Field(default_factory=list)
    proposal_follow_up_state: ProposalFollowUpState | None = None

    @field_serializer("last_activity_at")
    def serialize_last_activity(self, value: datetime, _info) -> str:
        return value.isoformat()


class AgentDetailResponse(BaseSchema):
    user: UserRead
    kpis: AgentDetailKPIs
    streams: list[AgentDetailStreamRow]
    page: int
    size: int
    total: int
    pages: int
