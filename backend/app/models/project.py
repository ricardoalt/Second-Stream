"""
Project model.
Represents waste assessment projects at client locations.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    select,
)
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.dialects.postgresql import JSON, JSONB
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from app.models.base import BaseModel


class Project(BaseModel):
    """
    Project model representing a waste assessment at a specific location.

    NEW: Projects now belong to Locations (which belong to Companies)
    LEGACY: client and location columns kept for backward compatibility

    Attributes:
        location_id: NEW - FK to Location (company site)
        user_id: Owner of the project (sales agent)
        name: Project name
        client: LEGACY - Use location.company.name instead
        sector: Industry sector
        subsector: Industry subsector
        location: LEGACY - Use location.name instead
        project_type: Type of waste stream
        description: Project description
        budget: Estimated budget in USD
        schedule_summary: Schedule summary text
        status: Current project status
        progress: Project completion percentage (0-100)
        tags: Optional tags for categorization
    """

    __tablename__ = "projects"

    __table_args__ = (
        Index("ix_project_data_gin", "project_data", postgresql_using="gin"),
        CheckConstraint(
            "proposal_follow_up_state IS NULL OR proposal_follow_up_state IN "
            "('uploaded', 'waiting_to_send', 'waiting_response', "
            "'under_negotiation', 'accepted', 'rejected')",
            name="ck_projects_proposal_follow_up_state",
        ),
        UniqueConstraint("id", "organization_id", name="uq_projects_id_org"),
        ForeignKeyConstraint(
            ["location_id", "organization_id"],
            ["locations.id", "locations.organization_id"],
            name="fk_project_location_org",
            ondelete="CASCADE",
        ),
        Index("ix_projects_location_org", "location_id", "organization_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    # ═══════════════════════════════════════════════════════════
    # NEW: LOCATION RELATIONSHIP
    # ═══════════════════════════════════════════════════════════
    location_id: Mapped[UUID | None] = mapped_column(
        nullable=True,  # Nullable during migration, will be required later
        index=True,
        comment="FK to Location - company site where waste is generated",
    )

    # Ownership
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Basic Information
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # LEGACY: Keep for backward compatibility (will be deprecated)
    client: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="LEGACY - use location.company.name",
    )
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="LEGACY - use location.name",
    )

    sector: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Municipal, Industrial, Commercial, Residential",
    )
    subsector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    project_type: Mapped[str] = mapped_column(
        String(100),
        default="To be defined",
        comment="Type of treatment system",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Financial
    budget: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        comment="Estimated budget in USD",
    )

    # Schedule
    schedule_summary: Mapped[str] = mapped_column(
        String(255),
        default="To be defined",
        comment="High-level schedule summary",
    )

    # Status and Progress
    status: Mapped[str] = mapped_column(
        String(50),
        default="In Preparation",
        nullable=False,
        index=True,
        comment="Project status matching frontend enum",
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Completion percentage 0-100",
    )

    # Metadata
    tags: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        comment="Array of tags for categorization",
    )

    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    archived_by_parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )
    proposal_follow_up_state: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        index=True,
        comment="Stream-level proposal commercial follow-up state",
    )

    # ═══════════════════════════════════════════════════════════
    # FLEXIBLE PROJECT DATA (JSONB)
    # ═══════════════════════════════════════════════════════════
    project_data: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
        comment="Flexible JSONB storage for all project technical data (technical_sections, etc.)",
    )

    # Relationships
    location_rel = relationship(
        "Location",
        back_populates="projects",
        foreign_keys=[location_id],
    )
    user = relationship(
        "User",
        back_populates="projects",
        foreign_keys=[user_id],
    )

    proposals = relationship(
        "Proposal",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(Proposal.created_at)",
        lazy="selectin",
    )

    files = relationship(
        "ProjectFile",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ProjectFile.created_at)",
        lazy="dynamic",
    )

    timeline = relationship(
        "TimelineEvent",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(TimelineEvent.created_at)",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        state = sa_inspect(self)
        name = state.dict.get("name")
        project_id = state.identity[0] if state.identity else None
        return f"<Project id={project_id} name={name!r}>"

    # NOTE: files_count is defined AFTER class body via column_property (see bottom of file)

    @property
    def company_name(self) -> str | None:
        """Get company name from location relationship."""
        state = sa_inspect(self)
        if "location_rel" in state.unloaded:
            return self.client

        location = self.location_rel
        if not location:
            return self.client

        location_state = sa_inspect(location)
        if "company" in location_state.unloaded:
            return self.client

        return location.company.name if location.company else self.client

    @property
    def location_name(self) -> str | None:
        """Get location name from relationship."""
        state = sa_inspect(self)
        if "location_rel" in state.unloaded:
            return self.location

        location = self.location_rel
        if not location:
            return self.location

        return location.name


# files_count: scalar subquery (avoids N+1 and raiseload conflicts)
from app.models.file import ProjectFile
from app.models.proposal import Proposal

Project.files_count = column_property(
    select(func.count(ProjectFile.id))
    .where(
        ProjectFile.project_id == Project.id,
        ProjectFile.organization_id == Project.organization_id,
    )
    .correlate_except(ProjectFile)
    .scalar_subquery(),
    deferred=False,
)

Project.proposals_count = column_property(
    select(func.count(Proposal.id))
    .where(
        Proposal.project_id == Project.id,
        Proposal.organization_id == Project.organization_id,
    )
    .correlate_except(Proposal)
    .scalar_subquery(),
    deferred=False,
)
