"""Message-owned chat attachment metadata for v1."""

from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ChatAttachment(BaseModel):
    """Uploaded attachment linked to zero or one chat message (draft-first lifecycle)."""

    __tablename__ = "chat_attachments"

    __table_args__ = (
        UniqueConstraint("storage_key", name="uq_chat_attachments_storage_key"),
        Index("ix_chat_attachments_message_created", "message_id", "created_at"),
        CheckConstraint(
            "artifact_type IS NULL OR artifact_type IN "
            "('generateIdeationBrief', 'generateAnalyticalRead', 'generatePlaybook')",
            name="ck_chat_attachments_artifact_type",
        ),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    uploaded_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    message_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        nullable=True,
    )

    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifact_type: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    message = relationship("ChatMessage", back_populates="attachments")
