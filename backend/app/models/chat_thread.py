"""Chat thread model with creator-only visibility in v1."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ChatThread(BaseModel):
    """Top-level chat conversation container."""

    __tablename__ = "chat_threads"

    __table_args__ = (
        UniqueConstraint("id", "organization_id", name="uq_chat_threads_id_org"),
        Index(
            "ix_chat_threads_org_creator_archived_lastmsg",
            "organization_id",
            "created_by_user_id",
            "archived_at",
            "last_message_at",
            "id",
        ),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages = relationship(
        "ChatMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="desc(ChatMessage.created_at)",
    )
