"""Voice interview models and idempotency records."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class VoiceInterview(BaseModel):
    __tablename__ = "voice_interviews"

    __table_args__ = (
        CheckConstraint(
            "status IN ('uploaded','queued','transcribing','extracting','review_ready','partial_finalized','finalized','failed')",
            name="ck_voice_interviews_status",
        ),
        CheckConstraint(
            "failed_stage IS NULL OR failed_stage IN ('transcribing','extracting')",
            name="ck_voice_interviews_failed_stage",
        ),
        CheckConstraint(
            "processing_attempts >= 0",
            name="ck_voice_interviews_processing_attempts",
        ),
        UniqueConstraint("bulk_import_run_id", name="uq_voice_interviews_run_id"),
        Index("ix_voice_interviews_org_created", "organization_id", "created_at"),
        Index("ix_voice_interviews_status_org", "status", "organization_id"),
        Index("ix_voice_interviews_company_id", "company_id"),
        Index("ix_voice_interviews_location_id", "location_id"),
        Index("ix_voice_interviews_consent_by_user_id", "consent_by_user_id"),
        Index("ix_voice_interviews_created_by_user_id", "created_by_user_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    location_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    bulk_import_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("import_runs.id", ondelete="CASCADE"), nullable=False
    )

    audio_object_key: Mapped[str] = mapped_column(Text, nullable=False)
    transcript_object_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")
    error_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    failed_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)
    processing_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consent_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    consent_copy_version: Mapped[str] = mapped_column(Text, nullable=False)

    audio_retention_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    transcript_retention_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class ImportRunIdempotencyKey(BaseModel):
    __tablename__ = "import_run_idempotency_keys"

    __table_args__ = (
        CheckConstraint(
            "operation_type IN ('finalize','retry')",
            name="ck_import_run_idempotency_operation_type",
        ),
        UniqueConstraint(
            "operation_type",
            "run_id",
            "idempotency_key",
            name="uq_import_run_idempotency_operation_run_key",
        ),
        Index("ix_import_run_idempotency_run", "run_id", "operation_type"),
    )

    operation_type: Mapped[str] = mapped_column(String(32), nullable=False)
    run_id: Mapped[UUID] = mapped_column(
        ForeignKey("import_runs.id", ondelete="CASCADE"), nullable=False
    )
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_json: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    response_status_code: Mapped[int] = mapped_column(Integer, nullable=False)
