"""ai discovery multi-scope phase1 contracts and schema

Revision ID: 20260408_1200
Revises: 20260406_1200
Create Date: 2026-04-08 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op


revision = "20260408_1200"
down_revision = "20260406_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("discovery_sessions", sa.Column("location_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_discovery_sessions_location",
        "discovery_sessions",
        "locations",
        ["location_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_discovery_sessions_location_status",
        "discovery_sessions",
        ["location_id", "status"],
        unique=False,
    )

    op.alter_column("discovery_sessions", "company_id", existing_type=sa.UUID(), nullable=True)
    op.create_check_constraint(
        "ck_discovery_sessions_location_requires_company",
        "discovery_sessions",
        "location_id IS NULL OR company_id IS NOT NULL",
    )

    op.alter_column("voice_interviews", "company_id", existing_type=sa.UUID(), nullable=True)

    op.drop_constraint("ck_import_runs_entrypoint_type", "import_runs", type_="check")
    op.create_check_constraint(
        "ck_import_runs_entrypoint_type",
        "import_runs",
        "entrypoint_type IN ('organization', 'company', 'location')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_import_runs_entrypoint_type", "import_runs", type_="check")
    op.create_check_constraint(
        "ck_import_runs_entrypoint_type",
        "import_runs",
        "entrypoint_type IN ('company', 'location')",
    )

    op.alter_column("voice_interviews", "company_id", existing_type=sa.UUID(), nullable=False)

    op.drop_constraint(
        "ck_discovery_sessions_location_requires_company",
        "discovery_sessions",
        type_="check",
    )
    op.alter_column("discovery_sessions", "company_id", existing_type=sa.UUID(), nullable=False)

    op.drop_index("ix_discovery_sessions_location_status", table_name="discovery_sessions")
    op.drop_constraint(
        "fk_discovery_sessions_location",
        "discovery_sessions",
        type_="foreignkey",
    )
    op.drop_column("discovery_sessions", "location_id")
