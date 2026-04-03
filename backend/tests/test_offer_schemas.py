from datetime import UTC, datetime
from uuid import uuid4

from app.schemas.offer import OfferDetailDTO, OfferInsightsFreshnessDTO, OfferV1Data
from app.schemas.project_data import ProjectDataStructure


def test_project_data_structure_includes_offer_v1_by_default():
    payload = ProjectDataStructure().model_dump()
    assert "offer_v1" in payload
    assert payload["offer_v1"] == OfferV1Data().model_dump()


def test_offer_detail_dto_serializes_freshness_metadata():
    generated_at = datetime.now(UTC)
    detail = OfferDetailDTO(
        project_id=uuid4(),
        stream_snapshot={},
        insights={
            "summary": "Solid baseline for offer delivery.",
            "key_points": ["Volume and contamination documented"],
            "risks": ["Pending permit confirmation"],
            "recommendations": ["Validate legal annex"],
            "freshness": OfferInsightsFreshnessDTO(
                generated_at=generated_at,
                source_updated_at=generated_at,
                is_stale=False,
            ),
        },
    )

    serialized = detail.model_dump(by_alias=True)
    assert "projectId" in serialized
    assert "streamSnapshot" in serialized
    assert serialized["insights"]["freshness"]["isStale"] is False
