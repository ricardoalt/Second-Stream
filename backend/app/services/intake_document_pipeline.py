"""Document analysis pipeline seam for future OCR/Textract."""

from __future__ import annotations

from pathlib import Path

from app.agents.document_analysis_agent import analyze_document
from app.models.document_analysis_output import DocumentAnalysisOutput
from app.services.document_text_extractor import (
    MAX_EXTRACT_CHARS,
    TRUNCATION_MARKER,
    extract_docx_text,
    extract_xlsx_text,
)

MAX_PLAIN_TEXT_CHARS = MAX_EXTRACT_CHARS


async def analyze_project_file_document(
    *,
    file_bytes: bytes,
    filename: str,
    doc_type: str,
    field_catalog: str,
    media_type: str,
) -> DocumentAnalysisOutput:
    extension = Path(filename).suffix.lower()

    if extension == ".pdf":
        return await analyze_document(
            document_bytes=file_bytes,
            filename=filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
            media_type=media_type,
            extracted_text=None,
        )

    if extension == ".docx":
        extracted = extract_docx_text(file_bytes)
        return await analyze_document(
            document_bytes=None,
            filename=filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
            media_type="text/plain",
            extracted_text=extracted.text,
        )

    if extension == ".xlsx":
        extracted = extract_xlsx_text(file_bytes)
        return await analyze_document(
            document_bytes=None,
            filename=filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
            media_type="text/plain",
            extracted_text=extracted.text,
        )

    if extension in {".csv", ".txt"}:
        extracted_text = file_bytes.decode("utf-8", errors="ignore").strip()
        if len(extracted_text) > MAX_PLAIN_TEXT_CHARS:
            slice_len = max(0, MAX_PLAIN_TEXT_CHARS - len(TRUNCATION_MARKER))
            extracted_text = f"{extracted_text[:slice_len]}{TRUNCATION_MARKER}"
        return await analyze_document(
            document_bytes=None,
            filename=filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
            media_type="text/plain",
            extracted_text=extracted_text,
        )

    raise ValueError("unsupported_file_type")
