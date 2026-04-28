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
