"""add company/location classification zip

Revision ID: 20260226_1200
Revises: 20260223_1200
Create Date: 2026-02-26 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260226_1200"
down_revision = "20260223_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    customer_type = postgresql.ENUM(
        "buyer",
        "generator",
        "both",
        name="customer_type",
        create_type=False,
    )
    address_type = postgresql.ENUM(
        "headquarters",
        "pickup",
        "delivery",
        "billing",
        name="address_type",
        create_type=False,
    )

    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE customer_type AS ENUM (
                'buyer',
                'generator',
                'both'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE address_type AS ENUM (
                'headquarters',
                'pickup',
                'delivery',
                'billing'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.add_column(
        "companies",
        sa.Column(
            "customer_type",
            customer_type,
            nullable=False,
            server_default="both",
        ),
    )
    op.add_column(
        "locations",
        sa.Column(
            "address_type",
            address_type,
            nullable=False,
            server_default="headquarters",
        ),
    )
    op.add_column(
        "locations",
        sa.Column(
            "zip_code",
            sa.String(length=10),
            nullable=True,
        ),
    )

    with op.get_context().autocommit_block():
        op.create_index(
            "ix_companies_customer_type",
            "companies",
            ["customer_type"],
            unique=False,
            postgresql_concurrently=True,
        )
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_locations_address_type",
            "locations",
            ["address_type"],
            unique=False,
            postgresql_concurrently=True,
        )

    # Keep server defaults to support bulk/voice creation without explicit values


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_locations_address_type",
            table_name="locations",
            postgresql_concurrently=True,
        )
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_companies_customer_type",
            table_name="companies",
            postgresql_concurrently=True,
        )
    op.drop_column("locations", "zip_code")
    op.drop_column("locations", "address_type")
    op.drop_column("companies", "customer_type")

    op.execute("DROP TYPE IF EXISTS address_type")
    op.execute("DROP TYPE IF EXISTS customer_type")
