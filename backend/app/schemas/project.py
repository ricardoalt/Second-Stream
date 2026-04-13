"""
Project schemas matching frontend interfaces.
"""

from datetime import datetime
from typing import Annotated, ClassVar
from uuid import UUID

from pydantic import Field, field_serializer

from app.schemas.common import BaseSchema
from app.schemas.dashboard import ProposalFollowUpState
from app.schemas.proposal import ProposalResponse


class ProjectCreate(BaseSchema):
    """
    Schema for creating a new project (waste assessment).

    All data is inherited from Location → Company.
    No legacy fields - system is new, no backward compatibility needed.
    """

    # Required: Location relationship (single source of truth)
    location_id: UUID = Field(..., description="FK to Location (company site) - REQUIRED")
    owner_user_id: UUID | None = Field(
        default=None,
        description="Optional owner override (org admin/superadmin only)",
    )

    # Core fields
    name: str = Field(..., min_length=1, max_length=255)
    project_type: str = Field(default="Assessment", max_length=100)
    description: str | None = None
    budget: float = Field(default=0.0, ge=0)
    schedule_summary: str = Field(default="To be defined", max_length=255)
    tags: list[str] = Field(default_factory=list)

    class Config:
        json_schema_extra: ClassVar[dict[str, object]] = {
            "example": {
                "location_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Waste Resource Assessment - ABC Factory",
                "project_type": "Assessment",
                "description": "Initial waste assessment for recycling opportunities",
                "budget": 5000.0,
                "schedule_summary": "2 weeks",
                "tags": ["assessment", "recycling"],
            }
        }


class ProjectUpdate(BaseSchema):
    """Schema for updating project fields."""

    name: str | None = Field(None, min_length=1, max_length=255)
    client: str | None = Field(None, min_length=1, max_length=255)
    sector: str | None = None
    subsector: str | None = None
    location: str | None = None
    project_type: str | None = None
    description: str | None = None
    budget: float | None = Field(None, ge=0)
    schedule_summary: str | None = None
    status: str | None = None
    progress: int | None = Field(None, ge=0, le=100)
    tags: list[str] | None = None
    owner_user_id: UUID | None = Field(
        default=None,
        description="Optional owner override (org admin/superadmin only)",
    )

    class Config:
        json_schema_extra: ClassVar[dict[str, object]] = {
            "example": {
                "status": "In Engineering",
                "progress": 35,
                "budget": 165000.0,
            }
        }


class ProjectSummary(BaseSchema):
    """
    Lightweight project summary for list views and cards.

    Optimized for performance:
    - No relationship data (proposals loaded separately)
    - Minimal fields for fast serialization
    - Uses SQLAlchemy model properties (proposals_count)

    Best Practice: Pydantic V2 with from_attributes=True handles
    SQLAlchemy models automatically - no manual model_validate needed!

    Serializes to camelCase for frontend (inherited from BaseSchema).
    """

    # Core fields
    id: UUID
    user_id: UUID = Field(..., description="Owner of the project")
    name: Annotated[str, Field(max_length=255)]
    sector: str
    subsector: str | None = None

    # Location relationship (NEW)
    location_id: UUID | None = None

    # Computed from relationships (NEW - preferred)
    company_name: str | None = Field(
        default=None, description="Company name from location.company (computed)"
    )
    location_name: str | None = Field(
        default=None, description="Location name from location_rel (computed)"
    )

    # Legacy fields (kept for backward compatibility)
    # NOTE: These may be NULL for older records; we serialize safe fallbacks.
    client: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)

    # Status & progress
    status: str
    progress: Annotated[int, Field(ge=0, le=100)]
    proposal_follow_up_state: ProposalFollowUpState | None = None

    # Timestamps
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None
    archived_by_user_id: UUID | None = None
    archived_by_parent_id: UUID | None = None

    # Details
    project_type: str
    description: str | None = None
    budget: Annotated[float, Field(ge=0)]
    schedule_summary: str

    # Computed from relationship (SQLAlchemy @property)
    proposals_count: int = Field(default=0, description="Count from proposals relationship")

    files_count: int = Field(
        ...,  # Required - fail fast if column_property not mapped
        description="Count from files column_property (scalar subquery)",
    )

    # Metadata
    tags: list[str] = Field(default_factory=list)

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO 8601 string."""
        return dt.isoformat()

    @field_serializer("tags")
    def serialize_tags(self, tags: list[str] | None, _info) -> list[str]:
        """Ensure tags is always a list, never None."""
        return tags or []

    @field_serializer("client")
    def serialize_client(self, client: str | None, _info) -> str:
        """Return a non-null client label for the frontend."""
        return client or self.company_name or ""

    @field_serializer("location")
    def serialize_location(self, location: str | None, _info) -> str:
        """Return a non-null location label for the frontend."""
        return location or self.location_name or ""


class ProjectDetail(ProjectSummary):
    """
    Full project details with eager-loaded relationships.

    Includes proposals and recent timeline events (last 10).
    Files loaded via separate endpoint for performance.
    """

    proposals: list = Field(default_factory=list, description="Generated proposals")

    timeline: list = Field(default_factory=list, description="Recent activity events (last 10)")

    @field_serializer("proposals")
    def serialize_proposals(self, proposals: list, _info) -> list[dict]:
        """Serialize proposals with snapshot data."""
        if not proposals:
            return []

        return [
            ProposalResponse.from_model_with_snapshot(p).model_dump(by_alias=True)
            for p in proposals
        ]

    @field_serializer("timeline")
    def serialize_timeline(self, events: list, _info) -> list[dict]:
        """Serialize timeline events (last 10 for performance)."""
        if not events:
            return []

        from app.schemas.timeline import TimelineEventResponse

        return [
            TimelineEventResponse.model_validate(e).model_dump(by_alias=True)
            for e in events[:10]  # Limit to last 10
        ]


# ==============================================================================
# Dashboard Stats Schemas (Optimized Aggregation Response)
# ==============================================================================


class PipelineStageStats(BaseSchema):
    """Statistics for a single pipeline stage."""

    count: int = Field(description="Number of projects in this stage")
    avg_progress: int = Field(ge=0, le=100, description="Average progress percentage")


class DashboardStatsResponse(BaseSchema):
    """
    Pre-aggregated dashboard statistics.

    Replaces client-side calculations with fast database aggregations.

    Performance: O(1) query with GROUP BY vs O(N) frontend iterations.
    """

    # Totals
    total_projects: int = Field(description="Total number of projects")

    # By status
    in_preparation: int = Field(description="Projects in preparation")
    generating: int = Field(description="Projects generating proposals")
    ready: int = Field(description="Projects with ready proposals")
    completed: int = Field(description="Completed projects")

    # Aggregates
    avg_progress: int = Field(ge=0, le=100, description="Average progress across all projects")
    total_budget: float = Field(ge=0, description="Sum of all project budgets")

    # Metadata
    last_updated: datetime | None = Field(description="Most recent project update")

    # Pipeline breakdown
    pipeline_stages: dict[str, PipelineStageStats] = Field(description="Stats grouped by status")

    @field_serializer("last_updated")
    def serialize_datetime(self, dt: datetime | None, _info) -> str | None:
        """Serialize datetime to ISO 8601 string."""
        return dt.isoformat() if dt else None
