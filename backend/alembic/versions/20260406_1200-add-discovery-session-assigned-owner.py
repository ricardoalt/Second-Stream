"""add assigned owner to discovery sessions

Revision ID: 20260406_1200
Revises: 20260330_1200
Create Date: 2026-04-06 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op


revision = "20260406_1200"
down_revision = "20260330_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "discovery_sessions",
        sa.Column("assigned_owner_user_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_discovery_sessions_assigned_owner",
        "discovery_sessions",
        "users",
        ["assigned_owner_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_discovery_sessions_assigned_owner",
        "discovery_sessions",
        type_="foreignkey",
    )
    op.drop_column("discovery_sessions", "assigned_owner_user_id")
