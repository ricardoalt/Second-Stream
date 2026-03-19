import copy
import uuid
from datetime import UTC, datetime
from typing import Any, cast

import pytest
from conftest import (
    create_company,
    create_location,
    create_org,
    create_project,
    create_user,
)
from httpx import AsyncClient
from sqlalchemy import select

from app.models.document_analysis_output import (
    DocumentAnalysisOutput,
    DocumentBaseProposal,
    DocumentCustomProposal,
    DocumentEvidenceRef,
)
from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.user import UserRole
from app.services.document_text_extractor import ExtractedTextResult
from app.services.intake_document_pipeline import (
    MAX_PLAIN_TEXT_CHARS,
    analyze_project_file_document,
)
from app.services.intake_ingestion_service import IntakeIngestionService
from app.templates.assessment_questionnaire import get_assessment_questionnaire


def _first_field():
    questionnaire = get_assessment_questionnaire()
    section = questionnaire[0]
    field = section["fields"][0]
    return section, field, questionnaire


@pytest.mark.asyncio
async def test_ingestion_download_failure_marks_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Ingest Fail", f"org-ingest-fail-{uid}")
    user = await create_user(
        db_session,
        email=f"ingest-fail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Ingest Fail Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Ingest Fail Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Ingest Fail Project",
    )

    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="fail.pdf",
        file_path="projects/fail.pdf",
        file_size=10,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="processing",
        processing_attempts=1,
    )
    db_session.add(file)
    await db_session.commit()
    await db_session.refresh(file)

    async def _boom(_: str) -> bytes:
        raise RuntimeError("download failed")

    import app.services.intake_ingestion_service as ingestion_module

    monkeypatch.setattr(ingestion_module, "download_file_content", _boom)

    service = IntakeIngestionService()
    with pytest.raises(RuntimeError):
        await service.process_file(db_session, file)

    await db_session.refresh(file)
    assert file.processing_status == "failed"
    assert file.processing_error
    assert file.processed_at is not None


@pytest.mark.asyncio
async def test_persist_document_analysis_stores_summary_and_proposals(db_session):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Ingest Persist", f"org-ingest-persist-{uid}")
    user = await create_user(
        db_session,
        email=f"ingest-persist-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Ingest Persist Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Ingest Persist Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Ingest Persist Project",
    )
    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="analysis.pdf",
        file_path="projects/analysis.pdf",
        file_size=10,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="processing",
        processing_attempts=1,
    )
    db_session.add(file)
    await db_session.commit()
    await db_session.refresh(file)

    analysis = DocumentAnalysisOutput(
        summary="Document summary",
        proposals=[
            DocumentBaseProposal(
                target_kind="base_field",
                base_field_id="material_type",
                answer="Plastic film",
                confidence=87,
                evidence_refs=[DocumentEvidenceRef(page=2, excerpt="Material: plastic film")],
            ),
            DocumentCustomProposal(
                target_kind="custom_field",
                field_label="UN number",
                answer="UN1993",
                confidence=90,
                evidence_refs=[DocumentEvidenceRef(page=2, excerpt="UN Number: UN1993")],
            ),
        ],
    )

    service = IntakeIngestionService()
    await service._persist_document_analysis(db_session, file, analysis, "general")

    await db_session.flush()
    await db_session.refresh(file)

    analysis_payload = cast(dict[str, Any], file.ai_analysis)
    assert isinstance(analysis_payload, dict)
    assert analysis_payload["summary"] == "Document summary"
    proposals = cast(list[dict[str, Any]], analysis_payload["proposals"])
    assert len(proposals) == 2
    assert proposals[0]["target_kind"] == "base_field"
    assert proposals[0]["base_field_id"] == "material_type"
    assert proposals[0]["answer"] == "Plastic film"
    assert proposals[1]["target_kind"] == "custom_field"
    assert proposals[1]["field_label"] == "UN number"
    assert proposals[1]["answer"] == "UN1993"


@pytest.mark.asyncio
async def test_stale_legacy_cached_payload_is_not_reused(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Ingest Cache", f"org-ingest-cache-{uid}")
    user = await create_user(
        db_session,
        email=f"ingest-cache-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Ingest Cache Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Ingest Cache Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Ingest Cache Project",
    )

    file_hash = "same-hash"
    cached = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="cached.pdf",
        file_path="projects/cached.pdf",
        file_size=10,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        file_hash=file_hash,
        processing_status="completed",
        processing_attempts=1,
        processed_at=datetime.now(UTC),
        ai_analysis={"summary": "Legacy", "key_facts": ["old"]},
    )
    target = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="target.pdf",
        file_path="projects/target.pdf",
        file_size=10,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        file_hash=file_hash,
        processing_status="processing",
        processing_attempts=1,
    )
    db_session.add_all([cached, target])
    await db_session.commit()
    await db_session.refresh(target)

    called: dict[str, int] = {"count": 0}

    async def _fake_download(_path: str) -> bytes:
        return b"%PDF"

    async def _fake_analyze_project_file_document(**_kwargs):
        called["count"] += 1
        return DocumentAnalysisOutput(
            summary="Fresh summary",
            proposals=[
                DocumentBaseProposal(
                    target_kind="base_field",
                    base_field_id="material_type",
                    answer="Plastic",
                    confidence=90,
                    evidence_refs=[DocumentEvidenceRef(page=1, excerpt="Plastic material")],
                )
            ],
        )

    import app.services.intake_ingestion_service as ingestion_module

    monkeypatch.setattr(ingestion_module, "download_file_content", _fake_download)
    monkeypatch.setattr(
        ingestion_module,
        "analyze_project_file_document",
        _fake_analyze_project_file_document,
    )

    service = IntakeIngestionService()
    await service.process_file(db_session, target)

    await db_session.refresh(target)
    assert called["count"] == 1
    assert target.processing_status == "completed"
    payload = cast(dict[str, Any], target.ai_analysis)
    assert payload["summary"] == "Fresh summary"
    assert isinstance(payload.get("proposals"), list)


@pytest.mark.asyncio
async def test_intake_notes_upsert(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Intake", "org-intake")
    user = await create_user(
        db_session,
        email=f"intake-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Intake Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Intake"
    )
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Intake"
    )

    set_current_user(user)

    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/notes",
        json={"text": "First note"},
    )
    assert response.status_code == 200

    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/notes",
        json={"text": "Second note"},
    )
    assert response.status_code == 200

    result = await db_session.execute(
        select(IntakeNote).where(
            IntakeNote.project_id == project.id,
            IntakeNote.organization_id == org.id,
        )
    )
    notes = result.scalars().all()
    assert len(notes) == 1
    assert notes[0].text == "Second note"


@pytest.mark.asyncio
async def test_apply_reject_and_auto_reject(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Apply", "org-apply")
    user = await create_user(
        db_session,
        email=f"apply-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Apply Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Apply")
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Apply"
    )

    section, field, questionnaire = _first_field()
    project.project_data = {"technical_sections": copy.deepcopy(questionnaire)}
    await db_session.commit()

    suggestion1 = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Applied value",
        value_type="string",
        unit=None,
        confidence=90,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user.id,
    )
    suggestion2 = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Sibling value",
        value_type="string",
        unit=None,
        confidence=80,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user.id,
    )
    db_session.add_all([suggestion1, suggestion2])
    await db_session.commit()

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/suggestions/{suggestion1.id}",
        json={"status": "applied"},
    )
    assert response.status_code == 200

    refreshed = await db_session.get(IntakeSuggestion, suggestion2.id)
    assert refreshed.status == "rejected"


# ============================================================================
# Field Catalog Tests (New)
# ============================================================================


def test_build_questionnaire_registry_includes_field_type():
    """Test that field registry includes field_type metadata."""
    from app.services.intake_field_catalog import build_questionnaire_registry

    registry = build_questionnaire_registry()

    # Check that we have fields
    assert len(registry) > 0

    # Check that field_type is included
    for item in registry.values():
        assert item.field_type is not None
        assert item.field_type in ["text", "tags", "textarea", "combobox", "number", "radio"]


def test_normalize_field_id_handles_llm_variations():
    """Test field_id normalization handles common LLM output variations."""
    from app.services.intake_field_catalog import normalize_field_id

    # Underscores to dashes
    assert normalize_field_id("waste_types") == "waste-types"

    # Case insensitive
    assert normalize_field_id("Waste-Types") == "waste-types"
    assert normalize_field_id("PAIN-POINTS") == "pain-points"

    # Trailing colon/punctuation
    assert normalize_field_id("pain-points:") == "pain-points"
    assert normalize_field_id("pain-points.") == "pain-points"
    assert normalize_field_id("pain-points,") == "pain-points"
    assert normalize_field_id("pain-points: ") == "pain-points"

    # Quotes/backticks
    assert normalize_field_id("`waste-types`") == "waste-types"
    assert normalize_field_id('"waste-types"') == "waste-types"
    assert normalize_field_id("'waste-types'") == "waste-types"

    # Whitespace
    assert normalize_field_id("  waste-types  ") == "waste-types"

    # Combined worst case
    assert normalize_field_id(" `Waste_Types`: ") == "waste-types"

    # Empty/edge cases
    assert normalize_field_id("") == ""
    assert normalize_field_id("   ") == ""


def test_format_catalog_for_prompt_structure():
    """Test that catalog format includes type information."""
    from app.services.intake_field_catalog import (
        build_questionnaire_registry,
        format_catalog_for_prompt,
    )

    registry = build_questionnaire_registry()
    catalog = format_catalog_for_prompt(registry)

    # Check header
    assert "CATALOG_VERSION=1" in catalog
    assert "LANGUAGE=EN" in catalog

    # Check field entries have type
    assert "type:" in catalog

    # Check specific fields exist
    assert "field_id:" in catalog
    assert "section:" in catalog
    assert "label:" in catalog


def test_apply_suggestion_parses_tags():
    """Test that apply_suggestion correctly parses tags fields."""
    from app.services.intake_field_catalog import apply_suggestion

    # Test comma-separated string
    result = apply_suggestion("tags", "Storage, Recycling, Neutralization")
    assert result == ["Storage", "Recycling", "Neutralization"]

    # Test with extra spaces
    result = apply_suggestion("tags", "  Storage  ,  Recycling  ")
    assert result == ["Storage", "Recycling"]

    # Test empty values are dropped
    result = apply_suggestion("tags", "Storage,, ,Recycling")
    assert result == ["Storage", "Recycling"]


def test_apply_suggestion_handles_other_types():
    """Test that apply_suggestion handles other field types correctly."""
    from app.services.intake_field_catalog import apply_suggestion

    # Text field - ensure string
    assert apply_suggestion("text", 123) == "123"
    assert apply_suggestion("text", "hello") == "hello"

    # Textarea field - ensure string
    assert apply_suggestion("textarea", 456) == "456"

    # Number field - parse numbers
    assert apply_suggestion("number", "42") == 42
    assert apply_suggestion("number", "3.14") == 3.14
    assert apply_suggestion("number", "not a number") == "not a number"  # Falls back to string

    # Combobox - pass through
    assert apply_suggestion("combobox", "value") == "value"


@pytest.mark.asyncio
async def test_document_pipeline_routes_pdf_as_binary(monkeypatch):
    captured: dict[str, object] = {}

    async def _fake_analyze_document(**kwargs):
        captured.update(kwargs)
        return DocumentAnalysisOutput(summary=None, proposals=[])

    import app.services.intake_document_pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "analyze_document", _fake_analyze_document)

    await analyze_project_file_document(
        file_bytes=b"%PDF",
        filename="test.pdf",
        doc_type="general",
        field_catalog="catalog",
        media_type="application/pdf",
    )

    assert captured["document_bytes"] == b"%PDF"
    assert captured["extracted_text"] is None


@pytest.mark.asyncio
async def test_document_pipeline_routes_docx_xlsx_csv_txt_via_text(monkeypatch):
    captured: list[dict[str, object]] = []

    async def _fake_analyze_document(**kwargs):
        captured.append(kwargs)
        return DocumentAnalysisOutput(summary=None, proposals=[])

    import app.services.intake_document_pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "analyze_document", _fake_analyze_document)
    monkeypatch.setattr(
        pipeline_module,
        "extract_docx_text",
        lambda _bytes: ExtractedTextResult(text="docx text", char_count=9, truncated=False),
    )
    monkeypatch.setattr(
        pipeline_module,
        "extract_xlsx_text",
        lambda _bytes: ExtractedTextResult(text="xlsx text", char_count=9, truncated=False),
    )

    await analyze_project_file_document(
        file_bytes=b"docx",
        filename="test.docx",
        doc_type="general",
        field_catalog="catalog",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    await analyze_project_file_document(
        file_bytes=b"xlsx",
        filename="test.xlsx",
        doc_type="general",
        field_catalog="catalog",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    await analyze_project_file_document(
        file_bytes=b"a,b\n1,2",
        filename="test.csv",
        doc_type="general",
        field_catalog="catalog",
        media_type="text/csv",
    )
    await analyze_project_file_document(
        file_bytes=b"hello",
        filename="test.txt",
        doc_type="general",
        field_catalog="catalog",
        media_type="text/plain",
    )

    assert len(captured) == 4
    assert captured[0]["document_bytes"] is None
    assert captured[0]["extracted_text"] == "docx text"
    assert captured[1]["document_bytes"] is None
    assert captured[1]["extracted_text"] == "xlsx text"
    assert captured[2]["document_bytes"] is None
    assert captured[2]["extracted_text"] == "a,b\n1,2"
    assert captured[3]["document_bytes"] is None
    assert captured[3]["extracted_text"] == "hello"


@pytest.mark.asyncio
async def test_document_pipeline_truncates_large_csv_txt_text(monkeypatch):
    captured: list[dict[str, object]] = []

    async def _fake_analyze_document(**kwargs):
        captured.append(kwargs)
        return DocumentAnalysisOutput(summary=None, proposals=[])

    import app.services.intake_document_pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "analyze_document", _fake_analyze_document)

    long_text = "a" * (MAX_PLAIN_TEXT_CHARS + 200)
    await analyze_project_file_document(
        file_bytes=long_text.encode(),
        filename="big.csv",
        doc_type="general",
        field_catalog="catalog",
        media_type="text/csv",
    )
    await analyze_project_file_document(
        file_bytes=long_text.encode(),
        filename="big.txt",
        doc_type="general",
        field_catalog="catalog",
        media_type="text/plain",
    )

    assert len(captured) == 2
    csv_text = cast(str, captured[0]["extracted_text"])
    txt_text = cast(str, captured[1]["extracted_text"])
    assert len(csv_text) == MAX_PLAIN_TEXT_CHARS
    assert len(txt_text) == MAX_PLAIN_TEXT_CHARS
    assert csv_text.endswith("[TRUNCATED: content shortened]")
    assert txt_text.endswith("[TRUNCATED: content shortened]")
