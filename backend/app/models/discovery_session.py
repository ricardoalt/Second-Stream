"""Discovery wizard orchestration models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class DiscoverySession(BaseModel):
    """One user-visible discovery wizard session."""

    __tablename__ = "discovery_sessions"

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','uploading','processing','review_ready','partial_failure','failed')",
            name="ck_discovery_sessions_status",
        ),
        UniqueConstraint("id", "organization_id", name="uq_discovery_sessions_id_org"),
        Index("ix_discovery_sessions_org_status", "organization_id", "status"),
        Index("ix_discovery_sessions_company_status", "company_id", "status"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_data: Mapped[dict[str, object] | None] = mapped_column(
        JSONB(none_as_null=True),
        nullable=True,
    )

    sources = relationship(
        "DiscoverySource",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class DiscoverySource(BaseModel):
    """Single source unit attached to a discovery session."""

    __tablename__ = "discovery_sources"

    __table_args__ = (
        ForeignKeyConstraint(
            ["session_id", "organization_id"],
            ["discovery_sessions.id", "discovery_sessions.organization_id"],
            name="fk_discovery_sources_session_org",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "source_type IN ('file','audio','text')", name="ck_discovery_sources_source_type"
        ),
        CheckConstraint(
            "status IN ('uploaded','processing','review_ready','failed')",
            name="ck_discovery_sources_status",
        ),
        CheckConstraint(
            "size_bytes IS NULL OR size_bytes >= 0", name="ck_discovery_sources_size_bytes"
        ),
        CheckConstraint(
            "text_length IS NULL OR text_length >= 0", name="ck_discovery_sources_text_length"
        ),
        UniqueConstraint("import_run_id", name="uq_discovery_sources_import_run_id"),
        UniqueConstraint("voice_interview_id", name="uq_discovery_sources_voice_interview_id"),
        Index("ix_discovery_sources_session_status", "session_id", "status"),
        Index("ix_discovery_sources_org_type", "organization_id", "source_type"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id: Mapped[UUID] = mapped_column(nullable=False)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")

    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text_preview: Mapped[str | None] = mapped_column(String(255), nullable=True)

    import_run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("import_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    voice_interview_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("voice_interviews.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[dict[str, object] | None] = mapped_column(
        JSONB(none_as_null=True),
        nullable=True,
    )

    session = relationship("DiscoverySession", back_populates="sources", lazy="selectin")
