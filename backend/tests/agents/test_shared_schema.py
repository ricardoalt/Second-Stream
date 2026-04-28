from app.agents.shared_schema import PdfAttachmentOutput


def test_pdf_attachment_output_contract_is_stable():
    output = PdfAttachmentOutput.model_validate(
        {
            "attachment_id": "att-1",
            "filename": "report.pdf",
            "download_url": "https://example.com/signed",
            "view_url": "https://example.com/signed-inline",
            "expires_at": "2026-04-26T12:00:00Z",
            "size_bytes": 1024,
        }
    )

    assert output.model_dump() == {
        "attachment_id": "att-1",
        "filename": "report.pdf",
        "download_url": "https://example.com/signed",
        "view_url": "https://example.com/signed-inline",
        "expires_at": "2026-04-26T12:00:00Z",
        "size_bytes": 1024,
    }


def test_pdf_attachment_output_allows_optional_urls_and_expires_at():
    """PdfAttachmentOutput should allow omission of presigned URLs.

    Streaming tool output must resolve through persistent attachment_id,
    not stale presigned S3 URLs.
    """
    output = PdfAttachmentOutput.model_validate(
        {
            "attachment_id": "att-1",
            "filename": "report.pdf",
            "size_bytes": 1024,
        }
    )

    assert output.attachment_id == "att-1"
    assert output.download_url is None
    assert output.view_url is None
    assert output.expires_at is None
    assert output.size_bytes == 1024


def test_pdf_attachment_output_prefers_attachment_id_only():
    """When only attachment_id is provided, the output is valid and usable."""
    output = PdfAttachmentOutput(
        attachment_id="att-1",
        filename="report.pdf",
        size_bytes=2048,
    )

    assert output.model_dump() == {
        "attachment_id": "att-1",
        "filename": "report.pdf",
        "download_url": None,
        "view_url": None,
        "expires_at": None,
        "size_bytes": 2048,
    }
