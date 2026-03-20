"""Workspace v1 service layer."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any, ClassVar, Literal, Protocol, TypeAlias
from uuid import uuid4

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.project import Project
from app.models.user import User
from app.schemas.workspace import (
    WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS,
    WorkspaceBaseFieldItem,
    WorkspaceBaseFieldUpdateItem,
    WorkspaceConfirmProposalRequest,
    WorkspaceCustomFieldItem,
    WorkspaceCustomFieldUpdateItem,
    WorkspaceDerivedInsights,
    WorkspaceEvidenceItem,
    WorkspaceEvidenceRef,
    WorkspaceHydrateResponse,
    WorkspaceProposalBatch,
    WorkspaceProposalItem,
    WorkspaceReadiness,
    WorkspaceRefreshInsightsResponse,
)
from app.services.cache_service import cache_service
from app.services.intake_service import IntakeService
from app.services.project_data_service import ProjectDataService

WORKSPACE_PROJECT_DATA_KEY = "workspace_v1"
WORKSPACE_BASE_FIELDS_KEY = "base_fields"
WORKSPACE_CUSTOM_FIELDS_KEY = "custom_fields"
WORKSPACE_DERIVED_KEY = "derived"
WORKSPACE_DISCOVERY_COMPLETED_AT_KEY = "discovery_completed_at"
PROPOSAL_BATCH_TTL_SECONDS = 3600
logger = structlog.get_logger(__name__)

WorkspaceProcessingStatus = Literal["queued", "processing", "completed", "failed"]
WorkspaceBaseFieldKey: TypeAlias = Literal[
    "material_type",
    "material_name",
    "composition",
    "volume",
    "frequency",
]

BASE_FIELD_ORDER: tuple[WorkspaceBaseFieldKey, ...] = (
    "material_type",
    "material_name",
    "composition",
    "volume",
    "frequency",
)

BASE_FIELD_LABELS: dict[WorkspaceBaseFieldKey, str] = {
    "material_type": "Material type",
    "material_name": "Material name",
    "composition": "Composition",
    "volume": "Volume",
    "frequency": "Frequency",
}


class WorkspaceBatchScope(Protocol):
    id: Any
    organization_id: Any


class WorkspaceService:
    """Workspace v1 orchestration."""

    _proposal_batch_fallback_store: ClassVar[dict[str, dict[str, Any]]] = {}

    @staticmethod
    async def get_workspace(db: AsyncSession, project: Project) -> WorkspaceHydrateResponse:
        base_fields = WorkspaceService._build_base_field_items(project)
        custom_fields = WorkspaceService._build_custom_field_items(project)
        evidence_items = await WorkspaceService._load_evidence_items(db, project)
        context_note, _ = await WorkspaceService._load_context_note(db, project)
        derived = WorkspaceService._build_derived(
            project, base_fields, evidence_items, custom_fields
        )
        return WorkspaceHydrateResponse(
            project_id=project.id,
            base_fields=base_fields,
            custom_fields=custom_fields,
            evidence_items=evidence_items,
            context_note=context_note,
            derived=derived,
        )

    @staticmethod
    async def update_base_fields(
        db: AsyncSession,
        project: Project,
        current_user: User,
        updates: list[WorkspaceBaseFieldUpdateItem],
    ) -> WorkspaceHydrateResponse:
        current_values = WorkspaceService._get_workspace_base_values(project.project_data)
        for item in updates:
            current_values[item.field_id] = item.value.strip()

        await WorkspaceService._persist_workspace_patch(
            db=db,
            project=project,
            current_user=current_user,
            patch={WORKSPACE_BASE_FIELDS_KEY: current_values},
        )
        await db.refresh(project)
        return await WorkspaceService.get_workspace(db, project)

    @staticmethod
    async def update_context_note(
        db: AsyncSession,
        project: Project,
        current_user: User,
        text: str,
    ) -> IntakeNote:
        note = await IntakeService.save_notes(
            db=db,
            project=project,
            text=text,
            user_id=current_user.id,
        )
        await db.commit()
        await db.refresh(note)
        return note

    @staticmethod
    async def update_custom_fields(
        db: AsyncSession,
        project: Project,
        current_user: User,
        updates: list[WorkspaceCustomFieldUpdateItem],
    ) -> WorkspaceHydrateResponse:
        existing_custom_fields = WorkspaceService._build_custom_field_items(project)
        existing_by_id = {field.id: field for field in existing_custom_fields}

        updates_by_id: dict[str, WorkspaceCustomFieldUpdateItem] = {}
        for update in updates:
            if update.id in updates_by_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Duplicate custom field update ids are not allowed",
                        "code": "WORKSPACE_DUPLICATE_CUSTOM_FIELD_UPDATE_ID",
                        "details": {"id": update.id},
                    },
                )
            updates_by_id[update.id] = update

        missing_id = next(
            (field_id for field_id in updates_by_id if field_id not in existing_by_id), None
        )
        if missing_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Custom field not found",
                    "code": "WORKSPACE_CUSTOM_FIELD_NOT_FOUND",
                    "details": {"id": missing_id},
                },
            )

        base_keys = {
            WorkspaceService._normalize_field_key(field_id) for field_id in BASE_FIELD_ORDER
        }
        base_keys.update(
            WorkspaceService._normalize_field_key(label) for label in BASE_FIELD_LABELS.values()
        )

        merged_fields: list[WorkspaceCustomFieldItem] = []
        merged_label_keys: set[str] = set()
        for field in existing_custom_fields:
            update = updates_by_id.get(field.id)
            label = update.label if update is not None else field.label
            answer = update.answer if update is not None else field.answer
            normalized_label = WorkspaceService._normalize_field_key(label)
            if normalized_label in base_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Custom field label conflicts with base field",
                        "code": "WORKSPACE_BASE_FIELD_EDIT_FORBIDDEN",
                        "details": {"id": field.id, "label": label},
                    },
                )
            if normalized_label in merged_label_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Duplicate custom field label",
                        "code": "WORKSPACE_DUPLICATE_CUSTOM_FIELD",
                        "details": {"id": field.id, "label": label},
                    },
                )
            merged_label_keys.add(normalized_label)
            merged_fields.append(
                WorkspaceCustomFieldItem(
                    id=field.id,
                    label=label,
                    answer=answer,
                    created_at=field.created_at,
                    created_by=field.created_by,
                    evidence_refs=field.evidence_refs,
                    confidence=field.confidence,
                )
            )

        await WorkspaceService._persist_workspace_patch(
            db=db,
            project=project,
            current_user=current_user,
            patch={
                WORKSPACE_CUSTOM_FIELDS_KEY: [
                    WorkspaceService._serialize_custom_field_for_storage(field)
                    for field in merged_fields
                ]
            },
        )
        await db.refresh(project)
        return await WorkspaceService.get_workspace(db, project)

    @staticmethod
    async def refresh_insights(
        db: AsyncSession,
        project: Project,
        current_user: User,
    ) -> WorkspaceRefreshInsightsResponse:
        base_fields = WorkspaceService._build_base_field_items(project)
        custom_fields = WorkspaceService._build_custom_field_items(project)
        evidence_items = await WorkspaceService._load_evidence_items(db, project)

        completed_evidence = [
            item for item in evidence_items if item.processing_status == "completed"
        ]
        completed_files = await WorkspaceService._load_completed_project_files(db, project)
        generated_at = datetime.now(UTC)

        if not completed_evidence:
            derived = WorkspaceService._build_derived(
                project, base_fields, evidence_items, custom_fields
            )
            derived.summary = None
            derived.facts = []
            derived.missing_information = []
            derived.last_refreshed_at = generated_at
            batch_id = WorkspaceService._build_batch_id(project)
            await WorkspaceService._store_proposal_batch(
                batch_id=batch_id,
                project=project,
                proposals=[],
            )
            await WorkspaceService._persist_workspace_patch(
                db=db,
                project=project,
                current_user=current_user,
                patch={
                    WORKSPACE_DERIVED_KEY: WorkspaceService._serialize_derived_for_storage(derived),
                },
            )
            await db.refresh(project)
            return WorkspaceRefreshInsightsResponse(
                derived=derived,
                proposal_batch=WorkspaceProposalBatch(
                    batch_id=batch_id,
                    proposals=[],
                    generated_at=generated_at,
                ),
            )

        batch_id = WorkspaceService._build_batch_id(project)
        base_values = WorkspaceService._get_workspace_base_values(project.project_data)
        proposal_items, raw_proposals_count = WorkspaceService._collect_workspace_batch_proposals(
            files=completed_files,
            custom_fields=custom_fields,
            base_values=base_values,
        )
        filtered_proposals_count = len(proposal_items)
        digest_metrics = WorkspaceService._build_file_analysis_metrics(completed_files)
        logger.info(
            "workspace_analysis_file_proposals_collected",
            project_id=str(project.id),
            completed_evidence_count=digest_metrics["completed_evidence_count"],
            evidence_items_with_suggestions=digest_metrics["evidence_items_with_suggestions"],
            total_suggestions_in_digest=digest_metrics["total_suggestions_in_digest"],
            total_unmapped_in_digest=digest_metrics["total_unmapped_in_digest"],
            raw_proposals_count=raw_proposals_count,
            filtered_proposals_count=filtered_proposals_count,
        )
        logger.info(
            "workspace_analysis_proposals_processed",
            project_id=str(project.id),
            raw_proposals_count=raw_proposals_count,
            filtered_proposals_count=filtered_proposals_count,
        )
        if raw_proposals_count > 0 and filtered_proposals_count == 0:
            logger.warning(
                "workspace_analysis_proposals_all_filtered",
                project_id=str(project.id),
                raw_proposals_count=raw_proposals_count,
                filtered_proposals_count=filtered_proposals_count,
            )
        await WorkspaceService._store_proposal_batch(
            batch_id=batch_id,
            project=project,
            proposals=proposal_items,
        )

        derived = WorkspaceService._build_derived(
            project, base_fields, evidence_items, custom_fields
        )
        summary = WorkspaceService._derive_summary_from_completed_files(completed_files)
        derived.summary = summary
        derived.facts = []
        derived.missing_information = []
        derived.last_refreshed_at = generated_at

        await WorkspaceService._persist_workspace_patch(
            db=db,
            project=project,
            current_user=current_user,
            patch={WORKSPACE_DERIVED_KEY: WorkspaceService._serialize_derived_for_storage(derived)},
        )
        await db.refresh(project)
        return WorkspaceRefreshInsightsResponse(
            derived=derived,
            proposal_batch=WorkspaceProposalBatch(
                batch_id=batch_id,
                proposals=proposal_items,
                generated_at=generated_at,
            ),
        )

    @staticmethod
    async def confirm_proposals(
        db: AsyncSession,
        project: Project,
        current_user: User,
        payload: WorkspaceConfirmProposalRequest,
    ) -> tuple[list[WorkspaceCustomFieldItem], list[str], WorkspaceHydrateResponse]:
        existing_custom_fields = WorkspaceService._build_custom_field_items(project)
        existing_custom_by_id = {field.id: field for field in existing_custom_fields}
        existing_custom_key_to_id = {
            WorkspaceService._normalize_field_key(field.label): field.id
            for field in existing_custom_fields
        }
        existing_keys = {
            WorkspaceService._normalize_field_key(field.label) for field in existing_custom_fields
        }
        base_keys = {
            WorkspaceService._normalize_field_key(field_id) for field_id in BASE_FIELD_ORDER
        }
        base_keys.update(
            WorkspaceService._normalize_field_key(label) for label in BASE_FIELD_LABELS.values()
        )

        base_values = WorkspaceService._get_workspace_base_values(project.project_data)

        created: list[WorkspaceCustomFieldItem] = []
        updated_custom_fields: dict[str, WorkspaceCustomFieldItem] = {}
        ignored_temp_ids: list[str] = []
        seen_custom_labels_in_request: set[str] = set()
        seen_custom_field_ids_in_request: set[str] = set()
        seen_base_fields_in_request: set[str] = set()
        now = datetime.now(UTC)
        batch_proposals = await WorkspaceService._get_stored_proposal_batch(
            batch_id=payload.batch_id,
            project=project,
        )
        batch_lookup = {proposal.temp_id: proposal for proposal in batch_proposals}

        for proposal in payload.proposals:
            if not proposal.selected:
                ignored_temp_ids.append(proposal.temp_id)
                continue

            stored_proposal = batch_lookup.get(proposal.temp_id)
            if stored_proposal is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Proposal batch not found or expired",
                        "code": "WORKSPACE_PROPOSAL_BATCH_INVALID",
                        "details": {"tempId": proposal.temp_id},
                    },
                )

            proposed_answer = proposal.proposed_answer
            if proposed_answer is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Proposal answer cannot be empty",
                        "code": "WORKSPACE_INVALID_PROPOSAL_EDIT",
                        "details": {"tempId": proposal.temp_id},
                    },
                )
            edited_answer = proposed_answer.strip()
            if not edited_answer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Proposal answer cannot be empty",
                        "code": "WORKSPACE_INVALID_PROPOSAL_EDIT",
                        "details": {"tempId": proposal.temp_id},
                    },
                )
            if stored_proposal.target_kind == "base_field":
                if stored_proposal.base_field_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Invalid proposal target",
                            "code": "WORKSPACE_PROPOSAL_BATCH_INVALID",
                            "details": {"tempId": proposal.temp_id},
                        },
                    )
                base_field_id = stored_proposal.base_field_id
                if base_field_id in seen_base_fields_in_request:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Duplicate base field proposal",
                            "code": "WORKSPACE_DUPLICATE_BASE_FIELD_PROPOSAL",
                            "details": {"tempId": proposal.temp_id, "baseFieldId": base_field_id},
                        },
                    )
                seen_base_fields_in_request.add(base_field_id)
                base_values[base_field_id] = edited_answer
                continue

            proposed_label = proposal.proposed_label
            if proposed_label is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Custom field label cannot be empty",
                        "code": "WORKSPACE_INVALID_PROPOSAL_EDIT",
                        "details": {"tempId": proposal.temp_id},
                    },
                )
            edited_label = proposed_label.strip()
            if not edited_label:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Custom field label cannot be empty",
                        "code": "WORKSPACE_INVALID_PROPOSAL_EDIT",
                        "details": {"tempId": proposal.temp_id},
                    },
                )
            normalized_label = WorkspaceService._normalize_field_key(edited_label)
            if normalized_label in base_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Proposal flow cannot edit base fields",
                        "code": "WORKSPACE_BASE_FIELD_EDIT_FORBIDDEN",
                        "details": {
                            "tempId": proposal.temp_id,
                            "label": edited_label,
                        },
                    },
                )

            existing_custom_field_id = stored_proposal.existing_custom_field_id
            if existing_custom_field_id is not None:
                existing_custom_field = existing_custom_by_id.get(existing_custom_field_id)
                if existing_custom_field is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Proposal batch not found or expired",
                            "code": "WORKSPACE_PROPOSAL_BATCH_INVALID",
                            "details": {"tempId": proposal.temp_id},
                        },
                    )
                if existing_custom_field_id in seen_custom_field_ids_in_request:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Duplicate custom field proposal",
                            "code": "WORKSPACE_DUPLICATE_CUSTOM_FIELD",
                            "details": {
                                "tempId": proposal.temp_id,
                                "id": existing_custom_field_id,
                            },
                        },
                    )
                owner_id = existing_custom_key_to_id.get(normalized_label)
                if owner_id is not None and owner_id != existing_custom_field_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Proposal duplicates an existing custom field",
                            "code": "WORKSPACE_DUPLICATE_CUSTOM_FIELD",
                            "details": {
                                "tempId": proposal.temp_id,
                                "label": edited_label,
                            },
                        },
                    )
                seen_custom_field_ids_in_request.add(existing_custom_field_id)
                existing_keys.add(normalized_label)
                existing_custom_key_to_id[normalized_label] = existing_custom_field_id
                updated_custom_fields[existing_custom_field_id] = WorkspaceCustomFieldItem(
                    id=existing_custom_field.id,
                    label=edited_label,
                    answer=edited_answer,
                    created_at=existing_custom_field.created_at,
                    created_by=existing_custom_field.created_by,
                    evidence_refs=stored_proposal.evidence_refs,
                    confidence=stored_proposal.confidence,
                )
                continue

            if (
                normalized_label in existing_keys
                or normalized_label in seen_custom_labels_in_request
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Proposal duplicates an existing custom field",
                        "code": "WORKSPACE_DUPLICATE_CUSTOM_FIELD",
                        "details": {
                            "tempId": proposal.temp_id,
                            "label": edited_label,
                        },
                    },
                )

            seen_custom_labels_in_request.add(normalized_label)
            existing_keys.add(normalized_label)
            created.append(
                WorkspaceCustomFieldItem(
                    id=WorkspaceService._build_custom_field_id(edited_label),
                    label=edited_label,
                    answer=edited_answer,
                    created_at=now,
                    created_by="ai_confirmed",
                    evidence_refs=stored_proposal.evidence_refs,
                    confidence=stored_proposal.confidence,
                )
            )

        stored_fields = WorkspaceService._load_stored_custom_fields(project.project_data)
        persisted_fields: list[dict[str, Any]] = []
        for raw_field in stored_fields:
            raw_id = raw_field.get("id")
            if isinstance(raw_id, str) and raw_id in updated_custom_fields:
                persisted_fields.append(
                    WorkspaceService._serialize_custom_field_for_storage(
                        updated_custom_fields[raw_id],
                    ),
                )
                continue
            persisted_fields.append(raw_field)

        persisted_fields.extend(
            [WorkspaceService._serialize_custom_field_for_storage(field) for field in created],
        )
        await WorkspaceService._persist_workspace_patch(
            db=db,
            project=project,
            current_user=current_user,
            patch={
                WORKSPACE_BASE_FIELDS_KEY: base_values,
                WORKSPACE_CUSTOM_FIELDS_KEY: persisted_fields,
            },
        )
        await db.refresh(project)

        workspace = await WorkspaceService.get_workspace(db, project)
        await WorkspaceService._delete_stored_proposal_batch(payload.batch_id)
        return created, ignored_temp_ids, workspace

    @staticmethod
    async def complete_discovery(
        db: AsyncSession,
        project: Project,
        current_user: User,
    ) -> None:
        await WorkspaceService._persist_workspace_patch(
            db=db,
            project=project,
            current_user=current_user,
            patch={
                WORKSPACE_DISCOVERY_COMPLETED_AT_KEY: datetime.now(UTC).isoformat(),
            },
        )

    @staticmethod
    def _build_base_field_items(project: Project) -> list[WorkspaceBaseFieldItem]:
        values = WorkspaceService._get_workspace_base_values(project.project_data)
        items: list[WorkspaceBaseFieldItem] = []
        for field_id in BASE_FIELD_ORDER:
            value = values[field_id]
            items.append(
                WorkspaceBaseFieldItem(
                    field_id=field_id,
                    label=BASE_FIELD_LABELS[field_id],
                    value=value,
                    is_filled=bool(value.strip()),
                )
            )
        return items

    @staticmethod
    async def _load_completed_project_files(
        db: AsyncSession, project: Project
    ) -> list[ProjectFile]:
        result = await db.execute(
            select(ProjectFile)
            .where(
                ProjectFile.project_id == project.id,
                ProjectFile.organization_id == project.organization_id,
                ProjectFile.processing_status == "completed",
            )
            .order_by(ProjectFile.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    def _build_custom_field_items(project: Project) -> list[WorkspaceCustomFieldItem]:
        raw_fields = WorkspaceService._load_stored_custom_fields(project.project_data)
        items: list[WorkspaceCustomFieldItem] = []
        for raw_field in raw_fields:
            created_at_raw = raw_field.get("created_at")
            created_at = WorkspaceService._parse_datetime(created_at_raw)
            if created_at is None:
                continue
            evidence_refs = WorkspaceService._parse_evidence_refs(raw_field.get("evidence_refs"))
            label = raw_field.get("label")
            answer = raw_field.get("answer")
            field_id = raw_field.get("id")
            created_by = raw_field.get("created_by")
            if (
                not isinstance(label, str)
                or not isinstance(answer, str)
                or not isinstance(field_id, str)
            ):
                continue
            if created_by != "ai_confirmed":
                continue
            confidence_raw = raw_field.get("confidence")
            confidence = confidence_raw if isinstance(confidence_raw, int) else None
            items.append(
                WorkspaceCustomFieldItem(
                    id=field_id,
                    label=label,
                    answer=answer,
                    created_at=created_at,
                    created_by="ai_confirmed",
                    evidence_refs=evidence_refs,
                    confidence=confidence,
                )
            )
        return items

    @staticmethod
    async def _load_evidence_items(
        db: AsyncSession, project: Project
    ) -> list[WorkspaceEvidenceItem]:
        result = await db.execute(
            select(ProjectFile)
            .where(
                ProjectFile.project_id == project.id,
                ProjectFile.organization_id == project.organization_id,
            )
            .order_by(ProjectFile.created_at.desc())
        )
        files = result.scalars().all()
        items: list[WorkspaceEvidenceItem] = []
        for file in files:
            processing_status = WorkspaceService._normalize_processing_status(
                file.processing_status
            )
            analysis = file.ai_analysis if isinstance(file.ai_analysis, dict) else {}
            summary_raw = analysis.get("summary")
            summary = summary_raw if isinstance(summary_raw, str) else file.processed_text
            items.append(
                WorkspaceEvidenceItem(
                    id=file.id,
                    filename=file.filename,
                    category=file.category,
                    processing_status=processing_status,
                    uploaded_at=file.created_at,
                    summary=summary,
                    facts=[],
                    processing_error=file.processing_error,
                )
            )
        return items

    @staticmethod
    async def _load_context_note(
        db: AsyncSession,
        project: Project,
    ) -> tuple[str | None, datetime | None]:
        result = await db.execute(
            select(IntakeNote).where(
                IntakeNote.project_id == project.id,
                IntakeNote.organization_id == project.organization_id,
            )
        )
        note = result.scalar_one_or_none()
        if note is None:
            return None, None
        return note.text, note.updated_at

    @staticmethod
    def _build_derived(
        project: Project,
        base_fields: list[WorkspaceBaseFieldItem],
        evidence_items: list[WorkspaceEvidenceItem],
        custom_fields: list[WorkspaceCustomFieldItem],
    ) -> WorkspaceDerivedInsights:
        readiness = WorkspaceService._build_readiness(base_fields)
        stored = WorkspaceService._load_workspace_section(project.project_data).get(
            WORKSPACE_DERIVED_KEY
        )
        summary = None
        facts: list[str] = []
        missing_information: list[str] = []
        last_refreshed_at = None
        if isinstance(stored, dict):
            summary_raw = stored.get("summary")
            if isinstance(summary_raw, str) and summary_raw.strip():
                summary = summary_raw
            facts_raw = stored.get("facts")
            if isinstance(facts_raw, list):
                facts = [item for item in facts_raw if isinstance(item, str)]
            missing_raw = stored.get("missing_information")
            if isinstance(missing_raw, list):
                missing_information = [item for item in missing_raw if isinstance(item, str)]
            last_refreshed_at = WorkspaceService._parse_datetime(stored.get("last_refreshed_at"))

        return WorkspaceDerivedInsights(
            summary=summary,
            facts=facts,
            missing_information=missing_information,
            information_coverage=WorkspaceService._calculate_information_coverage(
                base_fields=base_fields,
                evidence_items=evidence_items,
                custom_fields=custom_fields,
            ),
            readiness=readiness,
            last_refreshed_at=last_refreshed_at,
        )

    @staticmethod
    def _build_readiness(base_fields: list[WorkspaceBaseFieldItem]) -> WorkspaceReadiness:
        missing = [field.field_id for field in base_fields if not field.is_filled]
        return WorkspaceReadiness(is_ready=not missing, missing_base_fields=missing)

    @staticmethod
    def _calculate_information_coverage(
        *,
        base_fields: list[WorkspaceBaseFieldItem],
        evidence_items: list[WorkspaceEvidenceItem],
        custom_fields: list[WorkspaceCustomFieldItem],
    ) -> int:
        filled_base_fields = sum(1 for field in base_fields if field.is_filled)
        completed_evidence = sum(
            1 for item in evidence_items if item.processing_status == "completed"
        )
        custom_count = len(custom_fields)
        total_slots = len(BASE_FIELD_ORDER) + 3 + 3
        completed_slots = filled_base_fields + min(completed_evidence, 3) + min(custom_count, 3)
        return round((completed_slots / total_slots) * 100) if total_slots else 0

    @staticmethod
    def _serialize_derived_for_storage(derived: WorkspaceDerivedInsights) -> dict[str, Any]:
        return {
            "summary": derived.summary,
            "facts": derived.facts,
            "missing_information": derived.missing_information,
            "last_refreshed_at": derived.last_refreshed_at.isoformat()
            if derived.last_refreshed_at is not None
            else None,
        }

    @staticmethod
    def _build_file_analysis_metrics(files: list[ProjectFile]) -> dict[str, int]:
        files_with_proposals = 0
        total_proposals = 0
        for file in files:
            analysis = file.ai_analysis if isinstance(file.ai_analysis, dict) else {}
            raw_proposals = analysis.get("proposals")
            proposal_count = len(raw_proposals) if isinstance(raw_proposals, list) else 0
            if proposal_count > 0:
                files_with_proposals += 1
            total_proposals += proposal_count
        return {
            "completed_evidence_count": len(files),
            "evidence_items_with_suggestions": files_with_proposals,
            "total_suggestions_in_digest": total_proposals,
            "total_unmapped_in_digest": 0,
        }

    @staticmethod
    def _derive_summary_from_completed_files(files: list[ProjectFile]) -> str | None:
        summary: str | None = None
        for file in files:
            analysis = file.ai_analysis if isinstance(file.ai_analysis, dict) else {}
            summary_raw = analysis.get("summary")
            if summary is None and isinstance(summary_raw, str) and summary_raw.strip():
                summary = summary_raw.strip()
            if summary is not None:
                break
        return summary

    @staticmethod
    def _collect_workspace_batch_proposals(
        *,
        files: list[ProjectFile],
        custom_fields: list[WorkspaceCustomFieldItem],
        base_values: dict[WorkspaceBaseFieldKey, str],
    ) -> tuple[list[WorkspaceProposalItem], int]:
        existing_custom_by_key = {
            WorkspaceService._normalize_field_key(field.label): field for field in custom_fields
        }
        base_label_keys = {
            WorkspaceService._normalize_field_key(field_id) for field_id in BASE_FIELD_ORDER
        }
        base_label_keys.update(
            WorkspaceService._normalize_field_key(label) for label in BASE_FIELD_LABELS.values()
        )
        seen_order: list[str] = []
        winners: dict[str, WorkspaceProposalItem] = {}
        raw_count = 0

        for file in files:
            for candidate in WorkspaceService._parse_file_proposals(file):
                raw_count += 1
                key = WorkspaceService._proposal_target_key(candidate)
                if key is None:
                    continue
                if candidate.target_kind == "base_field":
                    if candidate.base_field_id is None:
                        continue
                    current_base_value = base_values[candidate.base_field_id]
                    if WorkspaceService._values_effectively_equal(
                        candidate.proposed_answer,
                        current_base_value,
                    ):
                        continue
                if (
                    candidate.target_kind == "custom_field"
                    and WorkspaceService._normalize_field_key(candidate.proposed_label)
                    in existing_custom_by_key
                ):
                    existing = existing_custom_by_key[
                        WorkspaceService._normalize_field_key(candidate.proposed_label)
                    ]
                    if WorkspaceService._values_effectively_equal(
                        candidate.proposed_answer,
                        existing.answer,
                    ):
                        continue
                    candidate = WorkspaceProposalItem(
                        temp_id=candidate.temp_id,
                        target_kind="custom_field",
                        base_field_id=None,
                        existing_custom_field_id=existing.id,
                        proposed_label=existing.label,
                        proposed_answer=candidate.proposed_answer,
                        selected=True,
                        evidence_refs=candidate.evidence_refs,
                        confidence=candidate.confidence,
                    )
                if (
                    candidate.target_kind == "custom_field"
                    and WorkspaceService._normalize_field_key(candidate.proposed_label)
                    in base_label_keys
                ):
                    continue
                current = winners.get(key)
                if current is None:
                    winners[key] = candidate
                    seen_order.append(key)
                    continue
                if WorkspaceService._is_higher_priority_batch_proposal(candidate, current):
                    winners[key] = candidate

        limited_keys = seen_order[:WORKSPACE_PROPOSAL_BATCH_MAX_ITEMS]
        return [winners[key] for key in limited_keys], raw_count

    @staticmethod
    def _parse_file_proposals(file: ProjectFile) -> list[WorkspaceProposalItem]:
        analysis = file.ai_analysis if isinstance(file.ai_analysis, dict) else None
        if analysis is None:
            return []
        raw_proposals = analysis.get("proposals")
        if not isinstance(raw_proposals, list):
            return []

        parsed: list[WorkspaceProposalItem] = []
        for raw_item in raw_proposals:
            if not isinstance(raw_item, dict):
                continue
            raw: dict[str, Any] = {
                str(key): value for key, value in raw_item.items() if isinstance(key, str)
            }

            target_kind_raw = raw.get("target_kind")
            if target_kind_raw not in {"base_field", "custom_field"}:
                continue
            answer_raw = raw.get("answer")
            if not isinstance(answer_raw, str):
                continue
            answer = answer_raw.strip()
            if not answer:
                continue

            confidence_raw = raw.get("confidence")
            confidence = confidence_raw if isinstance(confidence_raw, int) else None
            evidence_refs = WorkspaceService._parse_file_proposal_evidence_refs(file, raw)
            if not evidence_refs:
                continue

            if target_kind_raw == "base_field":
                base_field_id_raw = raw.get("base_field_id")
                base_field_id = WorkspaceService._parse_workspace_base_field_id(base_field_id_raw)
                if base_field_id is None:
                    continue
                parsed.append(
                    WorkspaceProposalItem(
                        temp_id=f"proposal-{uuid4().hex[:12]}",
                        target_kind="base_field",
                        base_field_id=base_field_id,
                        existing_custom_field_id=None,
                        proposed_label=BASE_FIELD_LABELS[base_field_id],
                        proposed_answer=answer,
                        selected=True,
                        evidence_refs=evidence_refs,
                        confidence=confidence,
                    )
                )
                continue

            label_raw = raw.get("field_label")
            if not isinstance(label_raw, str):
                continue
            label = label_raw.strip()
            if not label:
                continue
            parsed.append(
                WorkspaceProposalItem(
                    temp_id=f"proposal-{uuid4().hex[:12]}",
                    target_kind="custom_field",
                    base_field_id=None,
                    existing_custom_field_id=None,
                    proposed_label=label,
                    proposed_answer=answer,
                    selected=True,
                    evidence_refs=evidence_refs,
                    confidence=confidence,
                )
            )

        return parsed

    @staticmethod
    def _parse_workspace_base_field_id(value: Any) -> WorkspaceBaseFieldKey | None:
        if value == "material_type":
            return "material_type"
        if value == "material_name":
            return "material_name"
        if value == "composition":
            return "composition"
        if value == "volume":
            return "volume"
        if value == "frequency":
            return "frequency"
        return None

    @staticmethod
    def _values_effectively_equal(left: str, right: str) -> bool:
        return WorkspaceService._normalize_value_for_compare(
            left,
        ) == WorkspaceService._normalize_value_for_compare(right)

    @staticmethod
    def _normalize_value_for_compare(value: str) -> str:
        return " ".join(value.strip().lower().split())

    @staticmethod
    def _parse_file_proposal_evidence_refs(
        file: ProjectFile,
        raw_proposal: dict[str, Any],
    ) -> list[WorkspaceEvidenceRef]:
        raw_refs = raw_proposal.get("evidence_refs")
        if not isinstance(raw_refs, list):
            return []
        refs: list[WorkspaceEvidenceRef] = []
        for raw_ref in raw_refs:
            if not isinstance(raw_ref, dict):
                continue
            page_raw = raw_ref.get("page")
            excerpt_raw = raw_ref.get("excerpt")
            page = page_raw if isinstance(page_raw, int) else None
            excerpt = excerpt_raw if isinstance(excerpt_raw, str) else None
            refs.append(
                WorkspaceEvidenceRef(
                    file_id=file.id,
                    filename=file.filename,
                    page=page,
                    excerpt=excerpt,
                )
            )
        return refs

    @staticmethod
    def _proposal_target_key(proposal: WorkspaceProposalItem) -> str | None:
        if proposal.target_kind == "base_field":
            if proposal.base_field_id is None:
                return None
            return f"base:{proposal.base_field_id}"
        normalized = WorkspaceService._normalize_field_key(proposal.proposed_label)
        if not normalized:
            return None
        return f"custom:{normalized}"

    @staticmethod
    def _is_higher_priority_batch_proposal(
        candidate: WorkspaceProposalItem,
        current: WorkspaceProposalItem,
    ) -> bool:
        candidate_confidence = candidate.confidence if isinstance(candidate.confidence, int) else -1
        current_confidence = current.confidence if isinstance(current.confidence, int) else -1
        if candidate_confidence != current_confidence:
            return candidate_confidence > current_confidence
        if len(candidate.evidence_refs) != len(current.evidence_refs):
            return len(candidate.evidence_refs) > len(current.evidence_refs)
        return False

    @staticmethod
    def _get_workspace_base_values(
        project_data: dict[str, Any] | None,
    ) -> dict[WorkspaceBaseFieldKey, str]:
        workspace = WorkspaceService._load_workspace_section(project_data)
        raw_values = workspace.get(WORKSPACE_BASE_FIELDS_KEY)
        result: dict[WorkspaceBaseFieldKey, str] = {
            "material_type": "",
            "material_name": "",
            "composition": "",
            "volume": "",
            "frequency": "",
        }
        if not isinstance(raw_values, dict):
            return result
        for field_id in BASE_FIELD_ORDER:
            value = raw_values.get(field_id)
            if isinstance(value, str):
                result[field_id] = value
        return result

    @staticmethod
    def _load_workspace_section(project_data: dict[str, Any] | None) -> dict[str, Any]:
        if not isinstance(project_data, dict):
            return {}
        workspace = project_data.get(WORKSPACE_PROJECT_DATA_KEY)
        if not isinstance(workspace, dict):
            return {}
        return {str(key): value for key, value in workspace.items()}

    @staticmethod
    def _load_stored_custom_fields(project_data: dict[str, Any] | None) -> list[dict[str, Any]]:
        workspace = WorkspaceService._load_workspace_section(project_data)
        raw_fields = workspace.get(WORKSPACE_CUSTOM_FIELDS_KEY)
        if not isinstance(raw_fields, list):
            return []
        return [field for field in raw_fields if isinstance(field, dict)]

    @staticmethod
    async def _persist_workspace_patch(
        *,
        db: AsyncSession,
        project: Project,
        current_user: User,
        patch: dict[str, Any],
    ) -> None:
        await ProjectDataService.update_project_data(
            db=db,
            project_id=project.id,
            current_user=current_user,
            org_id=project.organization_id,
            updates={WORKSPACE_PROJECT_DATA_KEY: patch},
            merge=True,
            commit=True,
        )

    @staticmethod
    def _build_custom_field_id(label: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
        normalized_slug = slug or "custom-field"
        return f"{normalized_slug}-{uuid4().hex[:8]}"

    @staticmethod
    def _build_batch_id(project: Project) -> str:
        return f"wb-{project.id.hex[:12]}-{uuid4().hex[:12]}"

    @staticmethod
    def _normalize_field_key(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", value.lower())

    @staticmethod
    def _serialize_custom_field_for_storage(field: WorkspaceCustomFieldItem) -> dict[str, Any]:
        return {
            "id": field.id,
            "label": field.label,
            "answer": field.answer,
            "created_at": field.created_at.isoformat(),
            "created_by": field.created_by,
            "confidence": field.confidence,
            "evidence_refs": [ref.model_dump(mode="json") for ref in field.evidence_refs],
        }

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if not isinstance(value, str) or not value:
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return None
        return parsed.astimezone(UTC)

    @staticmethod
    def _parse_evidence_refs(value: Any) -> list[WorkspaceEvidenceRef]:
        if not isinstance(value, list):
            return []
        refs: list[WorkspaceEvidenceRef] = []
        for item in value:
            if not isinstance(item, dict):
                continue
            try:
                refs.append(WorkspaceEvidenceRef.model_validate(item))
            except Exception:
                continue
        return refs

    @staticmethod
    def _normalize_processing_status(value: str) -> WorkspaceProcessingStatus:
        if value == "queued":
            return "queued"
        if value == "processing":
            return "processing"
        if value == "completed":
            return "completed"
        return "failed"

    @staticmethod
    async def _store_proposal_batch(
        *,
        batch_id: str,
        project: WorkspaceBatchScope,
        proposals: list[WorkspaceProposalItem],
    ) -> None:
        payload = WorkspaceService._build_proposal_batch_payload(
            project=project,
            proposals=proposals,
            generated_at=datetime.now(UTC),
        )
        WorkspaceService._proposal_batch_fallback_store[batch_id] = payload
        await cache_service.set(batch_id, payload, ttl=PROPOSAL_BATCH_TTL_SECONDS)

    @staticmethod
    async def _get_stored_proposal_batch(
        *,
        batch_id: str,
        project: WorkspaceBatchScope,
    ) -> list[WorkspaceProposalItem]:
        WorkspaceService._cleanup_expired_fallback_batches()
        cached = await cache_service.get(batch_id)
        payload = cached if isinstance(cached, dict) else None
        if payload is None:
            fallback = WorkspaceService._proposal_batch_fallback_store.get(batch_id)
            payload = fallback if isinstance(fallback, dict) else None
        if payload is None:
            return []
        if WorkspaceService._is_batch_payload_expired(payload):
            await WorkspaceService._delete_stored_proposal_batch(batch_id)
            return []
        if payload.get("project_id") != str(project.id):
            return []
        if payload.get("organization_id") != str(project.organization_id):
            return []
        raw_proposals = payload.get("proposals")
        if not isinstance(raw_proposals, list):
            return []
        proposals: list[WorkspaceProposalItem] = []
        for raw_proposal in raw_proposals:
            if not isinstance(raw_proposal, dict):
                continue
            proposals.append(WorkspaceProposalItem.model_validate(raw_proposal))
        return proposals

    @staticmethod
    async def _delete_stored_proposal_batch(batch_id: str) -> None:
        WorkspaceService._proposal_batch_fallback_store.pop(batch_id, None)
        await cache_service.delete(batch_id)

    @staticmethod
    def _build_proposal_batch_payload(
        *,
        project: WorkspaceBatchScope,
        proposals: list[WorkspaceProposalItem],
        generated_at: datetime,
    ) -> dict[str, Any]:
        expires_at = generated_at + timedelta(seconds=PROPOSAL_BATCH_TTL_SECONDS)
        return {
            "project_id": str(project.id),
            "organization_id": str(project.organization_id),
            "generated_at": generated_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "proposals": [proposal.model_dump(mode="json") for proposal in proposals],
        }

    @staticmethod
    def _is_batch_payload_expired(payload: dict[str, Any]) -> bool:
        expires_at = WorkspaceService._parse_datetime(payload.get("expires_at"))
        if expires_at is None:
            return True
        return expires_at <= datetime.now(UTC)

    @staticmethod
    def build_workspace_v1_seed(
        *,
        material_type: str | None = None,
        material_name: str | None = None,
        composition: str | None = None,
        volume: str | None = None,
        frequency: str | None = None,
    ) -> dict[str, Any]:
        """Build the initial workspace_v1 dict to persist at project creation.

        Always produces all 5 base fields. Known values are seeded from the
        import/draft; missing ones default to "".
        """
        return {
            WORKSPACE_BASE_FIELDS_KEY: {
                "material_type": (material_type or "").strip(),
                "material_name": (material_name or "").strip(),
                "composition": (composition or "").strip(),
                "volume": (volume or "").strip(),
                "frequency": (frequency or "").strip(),
            }
        }

    @staticmethod
    def _cleanup_expired_fallback_batches() -> None:
        expired_batch_ids = [
            batch_id
            for batch_id, payload in WorkspaceService._proposal_batch_fallback_store.items()
            if WorkspaceService._is_batch_payload_expired(payload)
        ]
        for batch_id in expired_batch_ids:
            WorkspaceService._proposal_batch_fallback_store.pop(batch_id, None)
