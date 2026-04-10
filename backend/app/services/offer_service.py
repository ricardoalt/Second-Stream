"""Offer v1 orchestration service."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import offer_insights_agent
from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.project import Project
from app.models.user import User
from app.schemas.dashboard import ProposalFollowUpState
from app.schemas.offer import (
    OfferDetailDTO,
    OfferDocumentMetadataDTO,
    OfferInsightsData,
    OfferInsightsDTO,
    OfferInsightsFreshnessDTO,
    OfferInsightsFreshnessMetadata,
    OfferStreamSnapshotDTO,
    OfferV1Data,
)
from app.services.project_data_service import ProjectDataService
from app.services.project_file_service import OFFER_DOCUMENT_CATEGORY

logger = structlog.get_logger(__name__)

OFFER_PROJECT_DATA_KEY = "offer_v1"
WORKSPACE_PROJECT_DATA_KEY = "workspace_v1"
WORKSPACE_UPDATED_AT_KEY = "updated_at"
WORKSPACE_DISCOVERY_COMPLETED_AT_KEY = "discovery_completed_at"


class OfferService:
    """Offer detail/read + insight generation orchestration."""

    @staticmethod
    async def get_offer_detail(db: AsyncSession, project: Project) -> OfferDetailDTO:
        offer_v1 = OfferService._load_offer_v1(project.project_data)
        source_updated_at = await OfferService._resolve_source_updated_at(db=db, project=project)
        stream_snapshot = OfferService._load_stream_snapshot(project.project_data)

        offer_document = await OfferService._load_offer_document_metadata(db=db, project=project)

        generated_at = offer_v1.freshness.generated_at if offer_v1.freshness is not None else None
        insights_dto = OfferService._build_insights_dto(
            insights=offer_v1.insights,
            generated_at=generated_at,
            source_updated_at=source_updated_at,
        )

        return OfferService._build_offer_detail_dto(
            project=project,
            stream_snapshot=stream_snapshot,
            insights=insights_dto,
            offer_document=offer_document,
        )

    @staticmethod
    def _build_offer_detail_dto(
        *,
        project: Project,
        stream_snapshot: OfferStreamSnapshotDTO,
        insights: OfferInsightsDTO | None,
        offer_document: OfferDocumentMetadataDTO | None,
    ) -> OfferDetailDTO:
        follow_up_state = cast(ProposalFollowUpState | None, project.proposal_follow_up_state)

        return OfferDetailDTO(
            project_id=project.id,
            stream_snapshot=stream_snapshot,
            follow_up_state=follow_up_state,
            insights=insights,
            offer_document=offer_document,
        )

    @staticmethod
    def _build_insights_dto(
        *,
        insights: OfferInsightsData | None,
        generated_at: datetime | None,
        source_updated_at: datetime | None,
    ) -> OfferInsightsDTO | None:
        if insights is None:
            return None

        freshness = OfferInsightsFreshnessDTO(
            generated_at=generated_at,
            source_updated_at=source_updated_at,
            is_stale=bool(
                generated_at is not None
                and source_updated_at is not None
                and source_updated_at > generated_at
            ),
        )

        return OfferInsightsDTO(
            summary=insights.summary,
            key_points=insights.key_points,
            risks=insights.risks,
            recommendations=insights.recommendations,
            freshness=freshness,
        )

    @staticmethod
    def _load_stream_snapshot(project_data: dict[str, Any] | None) -> OfferStreamSnapshotDTO:
        if not isinstance(project_data, dict):
            return OfferStreamSnapshotDTO()
        workspace = project_data.get(WORKSPACE_PROJECT_DATA_KEY)
        if not isinstance(workspace, dict):
            return OfferStreamSnapshotDTO()
        base_fields = workspace.get("base_fields")
        if not isinstance(base_fields, dict):
            return OfferStreamSnapshotDTO()

        def _get_value(key: str) -> str | None:
            value = base_fields.get(key)
            if not isinstance(value, str):
                return None
            trimmed = value.strip()
            return trimmed or None

        return OfferStreamSnapshotDTO(
            material_type=_get_value("material_type"),
            material_name=_get_value("material_name"),
            composition=_get_value("composition"),
            volume=_get_value("volume"),
            frequency=_get_value("frequency"),
        )

    @staticmethod
    async def refresh_offer_insights(
        *,
        db: AsyncSession,
        project: Project,
        current_user: User,
    ) -> OfferDetailDTO:
        source_updated_at = await OfferService._resolve_source_updated_at(db=db, project=project)
        evidence_payload = await OfferService._build_evidence_payload(db=db, project=project)

        try:
            insight_output = await offer_insights_agent.analyze_offer_insights(
                project_id=str(project.id),
                evidence_payload=evidence_payload,
            )
        except offer_insights_agent.OfferInsightsError as exc:
            logger.error(
                "offer_insights_refresh_failed", project_id=str(project.id), error=str(exc)
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": "Offer insights generation failed",
                    "code": "OFFER_INSIGHTS_GENERATION_FAILED",
                },
            ) from exc

        existing_offer = OfferService._load_offer_v1(project.project_data)
        generated_at = datetime.now(UTC)
        next_offer = OfferV1Data(
            insights=OfferInsightsData(
                summary=insight_output.summary,
                key_points=insight_output.key_points,
                risks=insight_output.risks,
                recommendations=insight_output.recommendations,
            ),
            freshness=OfferInsightsFreshnessMetadata(
                generated_at=generated_at,
                source_updated_at=source_updated_at,
            ),
            offer_document=existing_offer.offer_document,
        )

        await OfferService._persist_offer_v1(
            db=db,
            project=project,
            current_user=current_user,
            offer_v1=next_offer,
        )

        stream_snapshot = OfferService._load_stream_snapshot(project.project_data)
        offer_document = await OfferService._load_offer_document_metadata(db=db, project=project)
        insights_dto = OfferService._build_insights_dto(
            insights=next_offer.insights,
            generated_at=generated_at,
            source_updated_at=source_updated_at,
        )

        return OfferService._build_offer_detail_dto(
            project=project,
            stream_snapshot=stream_snapshot,
            insights=insights_dto,
            offer_document=offer_document,
        )

    @staticmethod
    async def _load_offer_document_metadata(
        *,
        db: AsyncSession,
        project: Project,
    ) -> OfferDocumentMetadataDTO | None:
        result = await db.execute(
            select(ProjectFile)
            .where(
                ProjectFile.project_id == project.id,
                ProjectFile.organization_id == project.organization_id,
                ProjectFile.category == OFFER_DOCUMENT_CATEGORY,
            )
            .order_by(ProjectFile.created_at.desc())
            .limit(1)
        )
        file = result.scalar_one_or_none()
        if file is None:
            return None
        return OfferDocumentMetadataDTO(
            file_id=file.id,
            filename=file.filename,
            mime_type=file.mime_type,
            file_size=file.file_size,
            uploaded_at=file.created_at,
        )

    @staticmethod
    async def _resolve_source_updated_at(
        *,
        db: AsyncSession,
        project: Project,
    ) -> datetime | None:
        candidates: list[datetime] = []

        workspace_updated_at = OfferService._workspace_source_updated_at(project.project_data)
        if workspace_updated_at is not None:
            candidates.append(workspace_updated_at)

        note_updated_at = await db.scalar(
            select(func.max(IntakeNote.updated_at)).where(
                IntakeNote.project_id == project.id,
                IntakeNote.organization_id == project.organization_id,
            )
        )
        if isinstance(note_updated_at, datetime):
            candidates.append(note_updated_at.astimezone(UTC))

        file_updated_at = await db.scalar(
            select(func.max(ProjectFile.updated_at)).where(
                ProjectFile.project_id == project.id,
                ProjectFile.organization_id == project.organization_id,
                ProjectFile.category != OFFER_DOCUMENT_CATEGORY,
            )
        )
        if isinstance(file_updated_at, datetime):
            candidates.append(file_updated_at.astimezone(UTC))

        if not candidates:
            return None
        return max(candidates)

    @staticmethod
    def _workspace_source_updated_at(project_data: dict[str, Any] | None) -> datetime | None:
        if not isinstance(project_data, dict):
            return None
        workspace = project_data.get(WORKSPACE_PROJECT_DATA_KEY)
        if not isinstance(workspace, dict):
            return None

        candidates: list[datetime] = []
        for key in (WORKSPACE_UPDATED_AT_KEY, WORKSPACE_DISCOVERY_COMPLETED_AT_KEY):
            parsed = OfferService._parse_datetime(workspace.get(key))
            if parsed is not None:
                candidates.append(parsed)

        if not candidates:
            return None
        return max(candidates)

    @staticmethod
    async def _build_evidence_payload(*, db: AsyncSession, project: Project) -> str:
        lines: list[str] = [f"project_id: {project.id}"]
        workspace_payload = (
            project.project_data.get(WORKSPACE_PROJECT_DATA_KEY)
            if isinstance(project.project_data, dict)
            else None
        )
        workspace = (
            cast(dict[str, Any], workspace_payload) if isinstance(workspace_payload, dict) else {}
        )

        base_fields = workspace.get("base_fields")
        if isinstance(base_fields, dict):
            base_fields_map = cast(dict[str, Any], base_fields)
            lines.append("workspace_base_fields:")
            for key, value in base_fields_map.items():
                if isinstance(value, str) and value.strip():
                    lines.append(f"- {key}: {value.strip()}")

        custom_fields = workspace.get("custom_fields")
        if isinstance(custom_fields, list):
            lines.append("workspace_custom_fields:")
            for raw_field in custom_fields:
                if not isinstance(raw_field, dict):
                    continue
                label = raw_field.get("label")
                answer = raw_field.get("answer")
                if isinstance(label, str) and isinstance(answer, str) and answer.strip():
                    lines.append(f"- {label.strip()}: {answer.strip()}")

        questionnaire_answers = workspace.get("questionnaire_answers")
        if isinstance(questionnaire_answers, dict):
            questionnaire_answers_map = cast(dict[str, Any], questionnaire_answers)
            answered = [
                f"{question_id}={value.strip()}"
                for question_id, value in questionnaire_answers_map.items()
                if isinstance(value, str) and value.strip()
            ]
            if answered:
                lines.append("workspace_questionnaire_answers:")
                lines.extend(f"- {item}" for item in answered[:16])

        latest_note = await db.execute(
            select(IntakeNote)
            .where(
                IntakeNote.project_id == project.id,
                IntakeNote.organization_id == project.organization_id,
            )
            .order_by(IntakeNote.updated_at.desc())
            .limit(1)
        )
        note = latest_note.scalar_one_or_none()
        if note is not None and note.text.strip():
            lines.append("context_note:")
            lines.append(f"- {note.text.strip()[:1000]}")

        file_result = await db.execute(
            select(ProjectFile)
            .where(
                ProjectFile.project_id == project.id,
                ProjectFile.organization_id == project.organization_id,
                ProjectFile.processing_status == "completed",
                ProjectFile.category != OFFER_DOCUMENT_CATEGORY,
            )
            .order_by(ProjectFile.created_at.desc())
            .limit(8)
        )
        files = list(file_result.scalars().all())
        if files:
            lines.append("evidence_files:")
            for file in files:
                line = f"- [{file.category}] {file.filename}"
                if isinstance(file.ai_analysis, dict):
                    summary = file.ai_analysis.get("summary")
                    if isinstance(summary, str) and summary.strip():
                        line = f"{line} :: {summary.strip()[:220]}"
                elif isinstance(file.processed_text, str) and file.processed_text.strip():
                    line = f"{line} :: {file.processed_text.strip()[:220]}"
                lines.append(line)

        if len(lines) == 1:
            lines.append("- no_workspace_discovery_evidence_available")
        return "\n".join(lines)

    @staticmethod
    def _load_offer_v1(project_data: dict[str, Any] | None) -> OfferV1Data:
        if not isinstance(project_data, dict):
            return OfferV1Data()
        payload = project_data.get(OFFER_PROJECT_DATA_KEY, {})
        if not isinstance(payload, dict):
            return OfferV1Data()
        return OfferV1Data.model_validate(payload)

    @staticmethod
    async def _persist_offer_v1(
        *,
        db: AsyncSession,
        project: Project,
        current_user: User,
        offer_v1: OfferV1Data,
    ) -> None:
        current_data = (
            {str(key): value for key, value in project.project_data.items()}
            if isinstance(project.project_data, dict)
            else {}
        )
        next_data = {
            **current_data,
            OFFER_PROJECT_DATA_KEY: offer_v1.model_dump(mode="json"),
        }
        await ProjectDataService.update_project_data(
            db=db,
            project_id=project.id,
            current_user=current_user,
            org_id=project.organization_id,
            updates=next_data,
            merge=False,
            commit=True,
        )

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value.astimezone(UTC) if value.tzinfo is not None else value.replace(tzinfo=UTC)
        if not isinstance(value, str) or not value:
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)
