"""migrate company account status prospect to lead

Revision ID: 20260413_1200
Revises: 20260409_1200
Create Date: 2026-04-13 12:00:00.000000

"""

from alembic import op


revision = "20260413_1200"
down_revision = "20260409_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE account_status RENAME VALUE 'prospect' TO 'lead'")
    op.execute("ALTER TABLE companies ALTER COLUMN account_status SET DEFAULT 'lead'")


def downgrade() -> None:
    op.execute("ALTER TYPE account_status RENAME VALUE 'lead' TO 'prospect'")
    op.execute("ALTER TABLE companies ALTER COLUMN account_status SET DEFAULT 'active'")
