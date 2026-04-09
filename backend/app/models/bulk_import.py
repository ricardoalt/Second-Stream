"""Bulk import staging models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ImportRun(BaseModel):
    """Bulk import run lifecycle and audit metadata."""

    __tablename__ = "import_runs"

    __table_args__ = (
        CheckConstraint(
            "entrypoint_type IN ('organization', 'company', 'location')",
            name="ck_import_runs_entrypoint_type",
        ),
        CheckConstraint(
            "status IN ('uploaded', 'processing', 'review_ready', 'finalizing', 'completed', 'failed', 'no_data')",
            name="ck_import_runs_status",
        ),
        CheckConstraint(
            "source_type IN ('bulk_import', 'voice_interview')",
            name="ck_import_runs_source_type",
        ),
        CheckConstraint("processing_attempts >= 0", name="ck_import_runs_processing_attempts"),
        CheckConstraint("total_items >= 0", name="ck_import_runs_total_items"),
        CheckConstraint("accepted_count >= 0", name="ck_import_runs_accepted_count"),
        CheckConstraint("rejected_count >= 0", name="ck_import_runs_rejected_count"),
        CheckConstraint("amended_count >= 0", name="ck_import_runs_amended_count"),
        CheckConstraint("invalid_count >= 0", name="ck_import_runs_invalid_count"),
        CheckConstraint("duplicate_count >= 0", name="ck_import_runs_duplicate_count"),
        UniqueConstraint("id", "organization_id", name="uq_import_runs_id_org"),
        Index("ix_import_runs_org_status", "organization_id", "status"),
        Index("ix_import_runs_source_type_status", "source_type", "status"),
        Index("ix_import_runs_entrypoint", "entrypoint_type", "entrypoint_id"),
        Index("ix_import_runs_status_created", "status", "created_at"),
        Index(
            "ix_import_runs_claim_queue",
            "processing_available_at",
            "created_at",
            postgresql_where=text("status = 'uploaded'"),
        ),
        Index(
            "ix_import_runs_processing_lease",
            "processing_available_at",
            postgresql_where=text("status = 'processing'"),
        ),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    entrypoint_type: Mapped[str] = mapped_column(String(20), nullable=False)
    entrypoint_id: Mapped[UUID] = mapped_column(nullable=False)

    source_file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="bulk_import")

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")
    progress_step: Mapped[str | None] = mapped_column(String(64), nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    processing_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    processing_available_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    total_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accepted_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rejected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    amended_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    invalid_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    finalized_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    summary_data: Mapped[dict[str, object] | None] = mapped_column(
        JSONB(none_as_null=True),
        nullable=True,
    )
    audio_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    speaker_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcription_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifacts_purged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    items = relationship(
        "ImportItem",
        back_populates="run",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ImportItem(BaseModel):
    """Bulk import item staged for review and finalize."""

    __tablename__ = "import_items"

    __table_args__ = (
        ForeignKeyConstraint(
            ["run_id", "organization_id"],
            ["import_runs.id", "import_runs.organization_id"],
            name="fk_import_items_run_org",
            ondelete="CASCADE",
        ),
        CheckConstraint("item_type IN ('location', 'project')", name="ck_import_items_item_type"),
        CheckConstraint(
            "status IN ('pending_review', 'accepted', 'amended', 'rejected', 'invalid')",
            name="ck_import_items_status",
        ),
        CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 100)",
            name="ck_import_items_confidence",
        ),
        Index("ix_import_items_run_status", "run_id", "status"),
        Index(
            "ix_import_items_run_group",
            "run_id",
            "group_id",
            postgresql_where=text("group_id IS NOT NULL"),
        ),
        Index("ix_import_items_run_created_id", "run_id", "created_at", "id"),
        Index("ix_import_items_org_status", "organization_id", "status"),
        Index("ix_import_items_type_status", "item_type", "status"),
        Index("ix_import_items_parent", "parent_item_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_id: Mapped[UUID] = mapped_column(nullable=False)

    item_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending_review")

    needs_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)

    extracted_data: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, default=dict)
    normalized_data: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, default=dict)
    user_amendments: Mapped[dict[str, object] | None] = mapped_column(
        JSONB(none_as_null=True),
        nullable=True,
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    duplicate_candidates: Mapped[list[dict[str, object]] | None] = mapped_column(
        JSONB(none_as_null=True),
        nullable=True,
    )
    confirm_create_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    parent_item_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("import_items.id", ondelete="CASCADE"),
        nullable=True,
    )
    created_location_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_project_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    group_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    run = relationship("ImportRun", back_populates="items", lazy="selectin")
    parent = relationship(
        "ImportItem",
        remote_side="ImportItem.id",
        back_populates="children",
        lazy="selectin",
    )
    children = relationship("ImportItem", back_populates="parent", lazy="selectin")
