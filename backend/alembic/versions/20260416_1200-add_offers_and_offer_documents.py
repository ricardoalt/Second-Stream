"""add offers and offer documents

Revision ID: 20260416_1200
Revises: 20260413_1200
Create Date: 2026-04-16 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260416_1200"
down_revision = "20260413_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "offers",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("source_kind", sa.String(length=16), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("display_client", sa.String(length=255), nullable=True),
        sa.Column("display_location", sa.String(length=255), nullable=True),
        sa.Column("display_title", sa.String(length=255), nullable=False),
        sa.Column("context_summary", sa.Text(), nullable=True),
        sa.Column("context_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("insights_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "(source_kind = 'stream' AND project_id IS NOT NULL) OR "
            "(source_kind = 'manual' AND project_id IS NULL)",
            name="ck_offers_source_project_invariant",
        ),
        sa.CheckConstraint("source_kind IN ('stream', 'manual')", name="ck_offers_source_kind"),
        sa.CheckConstraint(
            "status IN ('uploaded', 'waiting_to_send', 'waiting_response', "
            "'under_negotiation', 'accepted', 'rejected')",
            name="ck_offers_status",
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_offers_project_org",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "organization_id", name="uq_offers_id_org"),
        sa.UniqueConstraint("project_id", name="uq_offers_project_id"),
    )
    op.create_index(op.f("ix_offers_id"), "offers", ["id"], unique=False)
    op.create_index(op.f("ix_offers_organization_id"), "offers", ["organization_id"], unique=False)
    op.create_index("ix_offers_org_status_archived", "offers", ["organization_id", "status", "archived_at"], unique=False)
    op.create_index(op.f("ix_offers_project_id"), "offers", ["project_id"], unique=False)
    op.create_index("ix_offers_source_kind", "offers", ["source_kind"], unique=False)
    op.create_index(op.f("ix_offers_status"), "offers", ["status"], unique=False)

    op.create_table(
        "offer_documents",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("offer_id", sa.UUID(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("file_type", sa.String(length=20), nullable=True),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("uploaded_by", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["offer_id", "organization_id"],
            ["offers.id", "offers.organization_id"],
            name="fk_offer_documents_offer_org",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_offer_documents_id"), "offer_documents", ["id"], unique=False)
    op.create_index(
        "ix_offer_documents_offer_org",
        "offer_documents",
        ["offer_id", "organization_id"],
        unique=False,
    )
    op.create_index(op.f("ix_offer_documents_offer_id"), "offer_documents", ["offer_id"], unique=False)
    op.create_index(
        "ix_offer_documents_one_active_per_offer",
        "offer_documents",
        ["offer_id"],
        unique=True,
        postgresql_where=sa.text("is_active"),
    )
    op.create_index(
        op.f("ix_offer_documents_organization_id"),
        "offer_documents",
        ["organization_id"],
        unique=False,
    )

    # Backfill stream-derived offers from existing projects with commercial offer signals.
    op.execute(
        """
        INSERT INTO offers (
            id,
            organization_id,
            source_kind,
            project_id,
            status,
            display_client,
            display_location,
            display_title,
            context_snapshot,
            insights_json,
            archived_at,
            created_by_user_id,
            updated_by_user_id,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            p.organization_id,
            'stream',
            p.id,
            COALESCE(p.proposal_follow_up_state, 'uploaded') AS status,
            NULLIF(BTRIM(p.client), ''),
            NULLIF(BTRIM(p.location), ''),
            p.name,
            p.project_data -> 'workspace_v1',
            p.project_data -> 'offer_v1',
            p.archived_at,
            p.user_id,
            p.user_id,
            p.created_at,
            p.updated_at
        FROM projects p
        WHERE p.proposal_follow_up_state IS NOT NULL
           OR EXISTS (
                SELECT 1
                FROM proposals pr
                WHERE pr.project_id = p.id
                  AND pr.organization_id = p.organization_id
            )
           OR EXISTS (
                SELECT 1
                FROM project_files pf
                WHERE pf.project_id = p.id
                  AND pf.organization_id = p.organization_id
                  AND pf.category = 'offer_document'
            )
           OR (p.project_data ? 'offer_v1')
        ON CONFLICT (project_id) DO NOTHING
        """
    )

    # Backfill active offer documents from latest project offer_document file.
    op.execute(
        """
        INSERT INTO offer_documents (
            id,
            organization_id,
            offer_id,
            filename,
            file_path,
            file_size,
            mime_type,
            file_type,
            file_hash,
            description,
            is_active,
            uploaded_by,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            o.organization_id,
            o.id,
            pf.filename,
            pf.file_path,
            pf.file_size,
            pf.mime_type,
            pf.file_type,
            pf.file_hash,
            pf.description,
            TRUE,
            pf.uploaded_by,
            pf.created_at,
            pf.updated_at
        FROM offers o
        JOIN LATERAL (
            SELECT pff.*
            FROM project_files pff
            WHERE pff.project_id = o.project_id
              AND pff.organization_id = o.organization_id
              AND pff.category = 'offer_document'
            ORDER BY pff.created_at DESC, pff.id DESC
            LIMIT 1
        ) pf ON TRUE
        WHERE o.source_kind = 'stream'
          AND NOT EXISTS (
              SELECT 1 FROM offer_documents od WHERE od.offer_id = o.id AND od.is_active
          )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_offer_documents_organization_id", table_name="offer_documents")
    op.drop_index("ix_offer_documents_one_active_per_offer", table_name="offer_documents")
    op.drop_index("ix_offer_documents_offer_id", table_name="offer_documents")
    op.drop_index("ix_offer_documents_offer_org", table_name="offer_documents")
    op.drop_index("ix_offer_documents_id", table_name="offer_documents")
    op.drop_table("offer_documents")

    op.drop_index("ix_offers_status", table_name="offers")
    op.drop_index("ix_offers_source_kind", table_name="offers")
    op.drop_index("ix_offers_project_id", table_name="offers")
    op.drop_index("ix_offers_org_status_archived", table_name="offers")
    op.drop_index("ix_offers_organization_id", table_name="offers")
    op.drop_index("ix_offers_id", table_name="offers")
    op.drop_table("offers")
