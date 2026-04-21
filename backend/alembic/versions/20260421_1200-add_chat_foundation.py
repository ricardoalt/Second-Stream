"""add chat foundation

Revision ID: 20260421_1200
Revises: 20260416_1200
Create Date: 2026-04-21 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260421_1200"
down_revision = "20260416_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_threads",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("last_message_preview", sa.Text(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "organization_id", name="uq_chat_threads_id_org"),
    )
    op.create_index(op.f("ix_chat_threads_id"), "chat_threads", ["id"], unique=False)
    op.create_index(
        "ix_chat_threads_org_creator_archived_lastmsg",
        "chat_threads",
        ["organization_id", "created_by_user_id", "archived_at", "last_message_at", "id"],
        unique=False,
    )

    op.create_table(
        "chat_messages",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("thread_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("error_code", sa.String(length=128), nullable=True),
        sa.Column("model_name", sa.String(length=128), nullable=True),
        sa.Column("token_usage_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["thread_id", "organization_id"],
            ["chat_threads.id", "chat_threads.organization_id"],
            name="fk_chat_messages_thread_org",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_id"), "chat_messages", ["id"], unique=False)
    op.create_index(
        "ix_chat_messages_thread_created_id",
        "chat_messages",
        ["thread_id", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_chat_messages_org_thread",
        "chat_messages",
        ["organization_id", "thread_id"],
        unique=False,
    )

    op.create_table(
        "chat_attachments",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["message_id"], ["chat_messages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key", name="uq_chat_attachments_storage_key"),
    )
    op.create_index(op.f("ix_chat_attachments_id"), "chat_attachments", ["id"], unique=False)
    op.create_index(
        "ix_chat_attachments_message_created",
        "chat_attachments",
        ["message_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_chat_attachments_message_created", table_name="chat_attachments")
    op.drop_index("ix_chat_attachments_id", table_name="chat_attachments")
    op.drop_table("chat_attachments")

    op.drop_index("ix_chat_messages_org_thread", table_name="chat_messages")
    op.drop_index("ix_chat_messages_thread_created_id", table_name="chat_messages")
    op.drop_index("ix_chat_messages_id", table_name="chat_messages")
    op.drop_table("chat_messages")

    op.drop_index("ix_chat_threads_org_creator_archived_lastmsg", table_name="chat_threads")
    op.drop_index("ix_chat_threads_id", table_name="chat_threads")
    op.drop_table("chat_threads")
