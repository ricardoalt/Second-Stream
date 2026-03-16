"""add discovery session orchestration tables

Revision ID: 20260313_1200
Revises: 20260309_1200
Create Date: 2026-03-13 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260313_1200"
down_revision = "20260309_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "discovery_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("started_by_user_id", sa.UUID(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("summary_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft','uploading','processing','review_ready','partial_failure','failed')",
            name="ck_discovery_sessions_status",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_discovery_sessions_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name="fk_discovery_sessions_company",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_discovery_sessions_created_by",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["started_by_user_id"],
            ["users.id"],
            name="fk_discovery_sessions_started_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "organization_id", name="uq_discovery_sessions_id_org"),
    )
    op.create_index(
        "ix_discovery_sessions_org_status",
        "discovery_sessions",
        ["organization_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_discovery_sessions_company_status",
        "discovery_sessions",
        ["company_id", "status"],
        unique=False,
    )

    op.create_table(
        "discovery_sources",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="uploaded"),
        sa.Column("source_filename", sa.String(length=255), nullable=True),
        sa.Column("source_storage_key", sa.String(length=1024), nullable=True),
        sa.Column("content_type", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("text_length", sa.Integer(), nullable=True),
        sa.Column("text_preview", sa.String(length=255), nullable=True),
        sa.Column("import_run_id", sa.UUID(), nullable=True),
        sa.Column("voice_interview_id", sa.UUID(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("result_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "source_type IN ('file','audio','text')",
            name="ck_discovery_sources_source_type",
        ),
        sa.CheckConstraint(
            "status IN ('uploaded','processing','review_ready','failed')",
            name="ck_discovery_sources_status",
        ),
        sa.CheckConstraint(
            "size_bytes IS NULL OR size_bytes >= 0",
            name="ck_discovery_sources_size_bytes",
        ),
        sa.CheckConstraint(
            "text_length IS NULL OR text_length >= 0",
            name="ck_discovery_sources_text_length",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_discovery_sources_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["session_id", "organization_id"],
            ["discovery_sessions.id", "discovery_sessions.organization_id"],
            name="fk_discovery_sources_session_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["import_run_id"],
            ["import_runs.id"],
            name="fk_discovery_sources_import_run",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["voice_interview_id"],
            ["voice_interviews.id"],
            name="fk_discovery_sources_voice_interview",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("import_run_id", name="uq_discovery_sources_import_run_id"),
        sa.UniqueConstraint("voice_interview_id", name="uq_discovery_sources_voice_interview_id"),
    )
    op.create_index(
        "ix_discovery_sources_session_status",
        "discovery_sources",
        ["session_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_discovery_sources_org_type",
        "discovery_sources",
        ["organization_id", "source_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_discovery_sources_org_type", table_name="discovery_sources")
    op.drop_index("ix_discovery_sources_session_status", table_name="discovery_sources")
    op.drop_table("discovery_sources")

    op.drop_index("ix_discovery_sessions_company_status", table_name="discovery_sessions")
    op.drop_index("ix_discovery_sessions_org_status", table_name="discovery_sessions")
    op.drop_table("discovery_sessions")
