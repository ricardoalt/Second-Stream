import pytest
import sqlalchemy as sa


def _collect_unique_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    unique_names = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints(table_name)
        if constraint.get("name")
    }
    unique_names |= {
        index["name"]
        for index in inspector.get_indexes(table_name)
        if index.get("unique") and index.get("name")
    }
    return unique_names


@pytest.mark.asyncio
async def test_chat_v1_contract_uses_creator_org_visibility_and_message_owned_attachments(
    test_engine,
):
    async with test_engine.connect() as connection:
        def _inspect(sync_connection):
            inspector = sa.inspect(sync_connection)

            thread_columns = {
                column["name"]: column
                for column in inspector.get_columns("chat_threads")
            }
            attachment_columns = {
                column["name"]: column
                for column in inspector.get_columns("chat_attachments")
            }
            attachment_foreign_keys = inspector.get_foreign_keys("chat_attachments")

            return thread_columns, attachment_columns, attachment_foreign_keys

        thread_columns, attachment_columns, attachment_foreign_keys = (
            await connection.run_sync(_inspect)
        )

    assert "visibility_scope" not in thread_columns
    assert "organization_id" in thread_columns
    assert "created_by_user_id" in thread_columns

    assert "message_id" in attachment_columns
    assert attachment_columns["message_id"]["nullable"] is True
    assert any(
        fk["referred_table"] == "chat_messages"
        and fk["constrained_columns"] == ["message_id"]
        for fk in attachment_foreign_keys
    )


@pytest.mark.asyncio
async def test_chat_v1_contract_freezes_index_and_unique_constraint_names(test_engine):
    async with test_engine.connect() as connection:
        def _inspect(sync_connection):
            inspector = sa.inspect(sync_connection)
            return {
                "threads_indexes": {idx["name"] for idx in inspector.get_indexes("chat_threads")},
                "messages_indexes": {
                    idx["name"] for idx in inspector.get_indexes("chat_messages")
                },
                "attachments_indexes": {
                    idx["name"] for idx in inspector.get_indexes("chat_attachments")
                },
                "threads_uniques": _collect_unique_names(inspector, "chat_threads"),
                "attachments_uniques": _collect_unique_names(inspector, "chat_attachments"),
            }

        contract = await connection.run_sync(_inspect)

    assert "ix_chat_threads_org_creator_archived_lastmsg" in contract["threads_indexes"]
    assert "uq_chat_threads_id_org" in contract["threads_uniques"]
    assert "ix_chat_messages_thread_created_id" in contract["messages_indexes"]
    assert "ix_chat_messages_org_thread" in contract["messages_indexes"]
    assert "ix_chat_attachments_message_created" in contract["attachments_indexes"]
    assert "uq_chat_attachments_storage_key" in contract["attachments_uniques"]


def test_chat_models_define_message_owned_attachment_relationship():
    from app.models.chat_attachment import ChatAttachment
    from app.models.chat_message import ChatMessage

    assert ChatAttachment.__tablename__ == "chat_attachments"
    assert ChatMessage.__tablename__ == "chat_messages"
    assert ChatAttachment.message_id.property.columns[0].nullable is True
    assert ChatAttachment.message.property.mapper.class_ is ChatMessage


def test_chat_model_discovery_exports_chat_models_and_alembic_env_imports_them():
    from app.models import ChatAttachment, ChatMessage, ChatThread

    assert ChatThread.__tablename__ == "chat_threads"
    assert ChatMessage.__tablename__ == "chat_messages"
    assert ChatAttachment.__tablename__ == "chat_attachments"

    from pathlib import Path

    alembic_env = (
        Path(__file__).resolve().parents[1] / "alembic" / "env.py"
    ).read_text(encoding="utf-8")
    assert "ChatThread" in alembic_env
    assert "ChatMessage" in alembic_env
    assert "ChatAttachment" in alembic_env
