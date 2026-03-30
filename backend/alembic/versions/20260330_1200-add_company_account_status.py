"""add company account status

Revision ID: 20260330_1200
Revises: 20260313_1200
Create Date: 2026-03-30 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260330_1200"
down_revision = "20260313_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    account_status = postgresql.ENUM(
        "active",
        "prospect",
        name="account_status",
        create_type=False,
    )

    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE account_status AS ENUM (
                'active',
                'prospect'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.add_column(
        "companies",
        sa.Column(
            "account_status",
            account_status,
            nullable=False,
            server_default="active",
        ),
    )

    with op.get_context().autocommit_block():
        op.create_index(
            "ix_companies_account_status",
            "companies",
            ["account_status"],
            unique=False,
            postgresql_concurrently=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_companies_account_status",
            table_name="companies",
            postgresql_concurrently=True,
        )

    op.drop_column("companies", "account_status")
    op.execute("DROP TYPE IF EXISTS account_status")
