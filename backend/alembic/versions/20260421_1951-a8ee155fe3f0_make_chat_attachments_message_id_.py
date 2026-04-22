"""make chat_attachments message_id nullable for drafts

Revision ID: a8ee155fe3f0
Revises: 20260421_1200
Create Date: 2026-04-21 19:51:05.794782

"""

from alembic import op
import sqlalchemy as sa


revision = "a8ee155fe3f0"
down_revision = "20260421_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "chat_attachments",
        "message_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "chat_attachments",
        "message_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
