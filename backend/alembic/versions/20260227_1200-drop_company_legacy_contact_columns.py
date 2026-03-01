"""drop legacy company contact columns

Revision ID: 20260227_1200
Revises: 20260226_1300
Create Date: 2026-02-27 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op


revision = "20260227_1200"
down_revision = "20260226_1300"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("companies", "contact_name")
    op.drop_column("companies", "contact_email")
    op.drop_column("companies", "contact_phone")


def downgrade() -> None:
    op.add_column("companies", sa.Column("contact_phone", sa.String(length=50), nullable=True))
    op.add_column("companies", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("companies", sa.Column("contact_name", sa.String(length=255), nullable=True))
