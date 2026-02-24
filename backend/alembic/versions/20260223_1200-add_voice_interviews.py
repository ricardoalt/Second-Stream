"""add voice interview primitives

Revision ID: 20260223_1200
Revises: 20260218_1200
Create Date: 2026-02-23 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260223_1200"
down_revision = "20260218_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "import_runs",
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="bulk_import"),
    )
    op.create_check_constraint(
        "ck_import_runs_source_type",
        "import_runs",
        "source_type IN ('bulk_import', 'voice_interview')",
    )
    op.create_index(
        "ix_import_runs_source_type_status",
        "import_runs",
        ["source_type", "status"],
        unique=False,
    )
    op.add_column("import_runs", sa.Column("audio_duration_seconds", sa.Integer(), nullable=True))
    op.add_column("import_runs", sa.Column("speaker_count", sa.Integer(), nullable=True))
    op.add_column("import_runs", sa.Column("transcription_model", sa.Text(), nullable=True))

    op.add_column("import_items", sa.Column("group_id", sa.String(length=128), nullable=True))
    op.create_index(
        "ix_import_items_run_group",
        "import_items",
        ["run_id", "group_id"],
        unique=False,
        postgresql_where=sa.text("group_id IS NOT NULL"),
    )

    op.create_table(
        "voice_interviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("location_id", sa.UUID(), nullable=True),
        sa.Column("bulk_import_run_id", sa.UUID(), nullable=False),
        sa.Column("audio_object_key", sa.Text(), nullable=False),
        sa.Column("transcript_object_key", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="uploaded"),
        sa.Column("error_code", sa.Text(), nullable=True),
        sa.Column("failed_stage", sa.String(length=32), nullable=True),
        sa.Column("processing_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consent_by_user_id", sa.UUID(), nullable=False),
        sa.Column("consent_copy_version", sa.Text(), nullable=False),
        sa.Column("audio_retention_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("transcript_retention_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('uploaded','queued','transcribing','extracting','review_ready','partial_finalized','finalized','failed')",
            name="ck_voice_interviews_status",
        ),
        sa.CheckConstraint(
            "failed_stage IS NULL OR failed_stage IN ('transcribing','extracting')",
            name="ck_voice_interviews_failed_stage",
        ),
        sa.CheckConstraint(
            "processing_attempts >= 0",
            name="ck_voice_interviews_processing_attempts",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["bulk_import_run_id"], ["import_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["consent_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bulk_import_run_id", name="uq_voice_interviews_run_id"),
    )
    op.create_index(
        "ix_voice_interviews_org_created",
        "voice_interviews",
        ["organization_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_voice_interviews_status_org",
        "voice_interviews",
        ["status", "organization_id"],
        unique=False,
    )
    op.create_index("ix_voice_interviews_company_id", "voice_interviews", ["company_id"], unique=False)
    op.create_index(
        "ix_voice_interviews_location_id",
        "voice_interviews",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_voice_interviews_consent_by_user_id",
        "voice_interviews",
        ["consent_by_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_voice_interviews_created_by_user_id",
        "voice_interviews",
        ["created_by_user_id"],
        unique=False,
    )

    op.create_table(
        "import_run_idempotency_keys",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("operation_type", sa.String(length=32), nullable=False),
        sa.Column("run_id", sa.UUID(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("response_status_code", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "operation_type IN ('finalize','retry')",
            name="ck_import_run_idempotency_operation_type",
        ),
        sa.ForeignKeyConstraint(["run_id"], ["import_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "operation_type",
            "run_id",
            "idempotency_key",
            name="uq_import_run_idempotency_operation_run_key",
        ),
    )
    op.create_index(
        "ix_import_run_idempotency_run",
        "import_run_idempotency_keys",
        ["run_id", "operation_type"],
        unique=False,
    )

    op.alter_column("import_runs", "source_type", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_import_run_idempotency_run", table_name="import_run_idempotency_keys")
    op.drop_table("import_run_idempotency_keys")

    op.drop_index("ix_voice_interviews_status_org", table_name="voice_interviews")
    op.drop_index("ix_voice_interviews_org_created", table_name="voice_interviews")
    op.drop_index("ix_voice_interviews_created_by_user_id", table_name="voice_interviews")
    op.drop_index("ix_voice_interviews_consent_by_user_id", table_name="voice_interviews")
    op.drop_index("ix_voice_interviews_location_id", table_name="voice_interviews")
    op.drop_index("ix_voice_interviews_company_id", table_name="voice_interviews")
    op.drop_table("voice_interviews")

    op.drop_index("ix_import_items_run_group", table_name="import_items")
    op.drop_column("import_items", "group_id")

    op.drop_column("import_runs", "transcription_model")
    op.drop_column("import_runs", "speaker_count")
    op.drop_column("import_runs", "audio_duration_seconds")
    op.drop_index("ix_import_runs_source_type_status", table_name="import_runs")
    op.drop_constraint("ck_import_runs_source_type", "import_runs", type_="check")
    op.drop_column("import_runs", "source_type")
