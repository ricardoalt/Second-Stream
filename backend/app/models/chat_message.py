"""Chat message model for persisted user/assistant turns."""

from uuid import UUID

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ChatMessage(BaseModel):
    """Message row persisted per chat turn."""

    __tablename__ = "chat_messages"

    __table_args__ = (
        ForeignKeyConstraint(
            ["thread_id", "organization_id"],
            ["chat_threads.id", "chat_threads.organization_id"],
            name="fk_chat_messages_thread_org",
            ondelete="CASCADE",
        ),
        Index("ix_chat_messages_thread_created_id", "thread_id", "created_at", "id"),
        Index("ix_chat_messages_org_thread", "organization_id", "thread_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    thread_id: Mapped[UUID] = mapped_column(nullable=False)
    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    token_usage_json: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)

    thread = relationship("ChatThread", back_populates="messages")
    attachments = relationship(
        "ChatAttachment",
        back_populates="message",
        cascade="all, delete-orphan",
        order_by="desc(ChatAttachment.created_at)",
    )
