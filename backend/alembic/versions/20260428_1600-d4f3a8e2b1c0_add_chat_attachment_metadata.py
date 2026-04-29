"""add chat attachment artifact_type for artifact rehydration

Revision ID: d4f3a8e2b1c0
Revises: a8ee155fe3f0
Create Date: 2026-04-28 16:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

revision = "d4f3a8e2b1c0"
down_revision = "a8ee155fe3f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_attachments",
        sa.Column(
            "artifact_type",
            sa.String(length=255),
            nullable=True,
        ),
    )
    op.create_check_constraint(
        "ck_chat_attachments_artifact_type",
        "chat_attachments",
        "artifact_type IS NULL OR artifact_type IN "
        "('generateIdeationBrief', 'generateAnalyticalRead', 'generatePlaybook')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_chat_attachments_artifact_type", "chat_attachments", type_="check")
    op.drop_column("chat_attachments", "artifact_type")
