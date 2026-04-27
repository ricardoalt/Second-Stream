import uuid

import pytest

from app.services.chat_stream_protocol import resolve_attachments_to_agent_input_for_model


def _build_attachment(*, content_type: str, storage_key: str, extracted_text: str | None):
    from app.models.chat_attachment import ChatAttachment

    attachment = ChatAttachment(
        organization_id=uuid.uuid4(),
        uploaded_by_user_id=uuid.uuid4(),
        storage_key=storage_key,
        original_filename=storage_key.split("/")[-1],
        content_type=content_type,
        size_bytes=1024,
        extracted_text=extracted_text,
    )
    attachment.id = uuid.uuid4()
    return attachment


@pytest.mark.asyncio
async def test_pdf_with_extracted_text_skips_binary_download(monkeypatch):
    calls: list[str] = []

    async def _fake_download(key: str) -> bytes:
        calls.append(key)
        return b"%PDF-1.7"

    monkeypatch.setattr(
        "app.services.chat_stream_protocol.download_file_content",
        _fake_download,
    )

    attachment = _build_attachment(
        content_type="application/pdf",
        storage_key="chat/org/user/report.pdf",
        extracted_text="parsed pdf text",
    )

    result = await resolve_attachments_to_agent_input_for_model([attachment])

    assert len(result) == 1
    assert calls == []
    assert result[0].extracted_text == "parsed pdf text"
    assert result[0].binary_content is None


@pytest.mark.asyncio
async def test_pdf_without_extracted_text_downloads_binary(monkeypatch):
    calls: list[str] = []

    async def _fake_download(key: str) -> bytes:
        calls.append(key)
        return b"%PDF-1.7"

    monkeypatch.setattr(
        "app.services.chat_stream_protocol.download_file_content",
        _fake_download,
    )

    attachment = _build_attachment(
        content_type="application/pdf",
        storage_key="chat/org/user/report.pdf",
        extracted_text=None,
    )

    result = await resolve_attachments_to_agent_input_for_model([attachment])

    assert calls == ["chat/org/user/report.pdf"]
    assert result[0].binary_content == b"%PDF-1.7"
    assert result[0].extracted_text is None


@pytest.mark.asyncio
async def test_text_attachment_behavior_unchanged_prefers_extracted_text(monkeypatch):
    async def _should_not_download(_key: str) -> bytes:
        raise AssertionError("download_file_content should not be called")

    monkeypatch.setattr(
        "app.services.chat_stream_protocol.download_file_content",
        _should_not_download,
    )

    attachment = _build_attachment(
        content_type="text/plain",
        storage_key="chat/org/user/notes.txt",
        extracted_text="already extracted",
    )

    result = await resolve_attachments_to_agent_input_for_model([attachment])

    assert result[0].extracted_text == "already extracted"
    assert result[0].binary_content is None
