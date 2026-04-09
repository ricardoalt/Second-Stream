"""make company subsector nullable

Revision ID: 20260409_1200
Revises: 20260408_1200
Create Date: 2026-04-09 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op


revision = "20260409_1200"
down_revision = "20260408_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE companies
        SET subsector = NULL
        WHERE subsector = ''
        """
    )

    op.alter_column(
        "companies",
        "subsector",
        existing_type=sa.String(length=100),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE companies
        SET subsector = 'other'
        WHERE subsector IS NULL
        """
    )

    op.alter_column(
        "companies",
        "subsector",
        existing_type=sa.String(length=100),
        nullable=False,
    )
