"""Offer-scoped document metadata."""

from uuid import UUID

from sqlalchemy import (
    Boolean,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class OfferDocument(BaseModel):
    """Uploaded file metadata linked to an Offer."""

    __tablename__ = "offer_documents"

    __table_args__ = (
        ForeignKeyConstraint(
            ["offer_id", "organization_id"],
            ["offers.id", "offers.organization_id"],
            name="fk_offer_documents_offer_org",
            ondelete="CASCADE",
        ),
        Index("ix_offer_documents_offer_org", "offer_id", "organization_id"),
        Index(
            "ix_offer_documents_one_active_per_offer",
            "offer_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    offer_id: Mapped[UUID] = mapped_column(nullable=False, index=True)

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    uploaded_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    offer = relationship("Offer", back_populates="documents")
