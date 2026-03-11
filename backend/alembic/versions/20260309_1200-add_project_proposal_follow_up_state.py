"""add project proposal follow up state

Revision ID: 20260309_1200
Revises: 20260227_1200
Create Date: 2026-03-09 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op


revision = "20260309_1200"
down_revision = "20260227_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("proposal_follow_up_state", sa.String(length=32), nullable=True),
    )
    op.create_check_constraint(
        "ck_projects_proposal_follow_up_state",
        "projects",
        "proposal_follow_up_state IS NULL OR proposal_follow_up_state IN "
        "('uploaded', 'waiting_to_send', 'waiting_response', "
        "'under_negotiation', 'accepted', 'rejected')",
    )
    op.create_index(
        "ix_projects_proposal_follow_up_state",
        "projects",
        ["proposal_follow_up_state"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_projects_proposal_follow_up_state", table_name="projects")
    op.drop_constraint("ck_projects_proposal_follow_up_state", "projects", type_="check")
    op.drop_column("projects", "proposal_follow_up_state")
