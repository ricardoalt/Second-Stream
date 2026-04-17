"""First-class Offer aggregate for stream and manual sources."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Offer(BaseModel):
    """Commercial offer tracked in Offers UI."""

    __tablename__ = "offers"

    __table_args__ = (
        CheckConstraint(
            "source_kind IN ('stream', 'manual')",
            name="ck_offers_source_kind",
        ),
        CheckConstraint(
            "status IN ('uploaded', 'waiting_to_send', 'waiting_response', "
            "'under_negotiation', 'accepted', 'rejected')",
            name="ck_offers_status",
        ),
        CheckConstraint(
            "(source_kind = 'stream' AND project_id IS NOT NULL) OR "
            "(source_kind = 'manual' AND project_id IS NULL)",
            name="ck_offers_source_project_invariant",
        ),
        UniqueConstraint("project_id", name="uq_offers_project_id"),
        UniqueConstraint("id", "organization_id", name="uq_offers_id_org"),
        ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_offers_project_org",
            ondelete="CASCADE",
        ),
        Index("ix_offers_org_status_archived", "organization_id", "status", "archived_at"),
        Index("ix_offers_source_kind", "source_kind"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    source_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    project_id: Mapped[UUID | None] = mapped_column(nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    display_client: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_title: Mapped[str] = mapped_column(String(255), nullable=False)
    context_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_snapshot: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    insights_json: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)

    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    documents = relationship(
        "OfferDocument",
        back_populates="offer",
        cascade="all, delete-orphan",
        order_by="desc(OfferDocument.created_at)",
        lazy="selectin",
    )
