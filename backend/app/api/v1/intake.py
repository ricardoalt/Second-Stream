"""Intake panel endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.agents.notes_analysis_agent import NotesAnalysisError
from app.api.dependencies import ActiveProjectDep, AsyncDB, CurrentUser, RateLimitUser10
from app.authz import permissions
from app.authz.authz import Ownership, require_permission
from app.schemas.common import ErrorResponse
from app.schemas.intake import (
    AnalyzeNotesRequest,
    AnalyzeNotesResponse,
    IntakeDismissUnmappedBulkRequest,
    IntakeDismissUnmappedBulkResponse,
    IntakeDismissUnmappedResponse,
    IntakeHydrateResponse,
    IntakeMapUnmappedRequest,
    IntakeMapUnmappedResponse,
    IntakeNotesUpdateRequest,
    IntakeNotesUpdateResponse,
    IntakeSuggestionBatchRequest,
    IntakeSuggestionBatchResponse,
    IntakeSuggestionBatchResultItem,
    IntakeSuggestionStatusRequest,
    IntakeSuggestionStatusResponse,
)
from app.services.intake_ingestion_service import IntakeIngestionService
from app.services.intake_service import IntakeBatchService, IntakeService

router = APIRouter()
notes_ingestion_service = IntakeIngestionService()


@router.get(
    "/{project_id}/intake",
    responses={404: {"model": ErrorResponse}},
    summary="Hydrate intake panel",
)
async def get_intake(
    project: ActiveProjectDep,
    db: AsyncDB,
) -> IntakeHydrateResponse:
    (
        notes,
        notes_updated_at,
        suggestions,
        unmapped,
        unmapped_count,
        processing_count,
    ) = await IntakeService.get_intake(db, project)
    return IntakeHydrateResponse(
        intake_notes=notes,
        notes_updated_at=notes_updated_at,
        suggestions=suggestions,
        unmapped_notes=unmapped,
        unmapped_notes_count=unmapped_count,
        processing_documents_count=processing_count,
    )


@router.patch(
    "/{project_id}/intake/notes",
    responses={404: {"model": ErrorResponse}},
    summary="Save intake notes",
)
async def save_intake_notes(
    project: ActiveProjectDep,
    payload: IntakeNotesUpdateRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> IntakeNotesUpdateResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    note = await IntakeService.save_notes(
        db=db,
        project=project,
        text=payload.text,
        user_id=current_user.id,
    )
    await db.commit()
    return IntakeNotesUpdateResponse(text=note.text, updated_at=note.updated_at)


@router.post(
    "/{project_id}/intake/notes/analyze",
    responses={404: {"model": ErrorResponse}},
    summary="Analyze intake notes",
)
async def analyze_intake_notes(
    project: ActiveProjectDep,
    payload: AnalyzeNotesRequest,
    current_user: CurrentUser,
    db: AsyncDB,
    _rate_limit: RateLimitUser10,
) -> AnalyzeNotesResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    try:
        (
            suggestions_count,
            unmapped_count,
            stale_ignored,
        ) = await notes_ingestion_service.analyze_notes_text(
            db=db,
            project=project,
            notes_updated_at=payload.notes_updated_at,
        )
        await db.commit()
        return AnalyzeNotesResponse(
            suggestions_count=suggestions_count,
            unmapped_count=unmapped_count,
            stale_ignored=stale_ignored,
        )
    except ValueError as exc:
        await db.rollback()
        error_key = str(exc)
        error_map = {
            "intake_notes_missing": {
                "message": "Intake notes required",
                "code": "NOTES_MISSING",
            },
            "intake_notes_too_short": {
                "message": "Intake notes too short",
                "code": "NOTES_TOO_SHORT",
            },
        }
        detail = error_map.get(
            error_key,
            {"message": "Invalid intake notes", "code": "NOTES_INVALID"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        ) from None
    except NotesAnalysisError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Notes analysis failed",
                "code": "NOTES_ANALYSIS_FAILED",
            },
        ) from None


@router.patch(
    "/{project_id}/intake/suggestions/{suggestion_id}",
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Apply or reject intake suggestion",
)
async def update_suggestion_status(
    project: ActiveProjectDep,
    suggestion_id: UUID,
    payload: IntakeSuggestionStatusRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> IntakeSuggestionStatusResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    try:
        if payload.status == "applied":
            suggestion = await IntakeService.apply_suggestion(
                db=db,
                project=project,
                suggestion_id=suggestion_id,
                current_user=current_user,
            )
        elif payload.status == "rejected":
            suggestion = await IntakeService.reject_suggestion(
                db=db,
                project=project,
                suggestion_id=suggestion_id,
                current_user=current_user,
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Suggestion not pending",
        ) from None

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Suggestion not pending",
        ) from None
    return IntakeSuggestionStatusResponse(
        id=suggestion.id,
        status=payload.status,
        updated_at=suggestion.updated_at,
    )


@router.post(
    "/{project_id}/intake/suggestions/batch",
    responses={404: {"model": ErrorResponse}},
    summary="Batch apply or reject suggestions",
)
async def batch_update_suggestions(
    project: ActiveProjectDep,
    payload: IntakeSuggestionBatchRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> IntakeSuggestionBatchResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    try:
        results = await IntakeBatchService.batch_update_suggestions(
            db=db,
            project=project,
            suggestion_ids=payload.suggestion_ids,
            target_status=payload.status,
            current_user=current_user,
        )
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Some suggestions could not be updated",
        ) from None

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Some suggestions could not be updated",
        ) from None

    applied_count = sum(1 for r in results if r.success and r.status == "applied")
    rejected_count = sum(1 for r in results if r.success and r.status == "rejected")
    error_count = sum(1 for r in results if not r.success)

    return IntakeSuggestionBatchResponse(
        results=[
            IntakeSuggestionBatchResultItem(
                id=r.id,
                success=r.success,
                status=r.status,
                error=r.error,
            )
            for r in results
        ],
        applied_count=applied_count,
        rejected_count=rejected_count,
        error_count=error_count,
    )


@router.post(
    "/{project_id}/intake/unmapped-notes/{note_id}/map",
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Map unmapped note to suggestion",
)
async def map_unmapped_note(
    project: ActiveProjectDep,
    note_id: UUID,
    payload: IntakeMapUnmappedRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> IntakeMapUnmappedResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    note, suggestion = await IntakeService.map_unmapped_note(
        db=db,
        project=project,
        note_id=note_id,
        field_id=payload.field_id,
        section_id=payload.section_id,
        field_label=payload.field_label,
        section_title=payload.section_title,
        current_user=current_user,
    )
    await db.commit()
    return IntakeMapUnmappedResponse(
        unmapped_note_id=note.id,
        suggestion=suggestion,
        mapped_to_suggestion_id=suggestion.id,
    )


@router.post(
    "/{project_id}/intake/unmapped-notes/{note_id}/dismiss",
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Dismiss unmapped note",
)
async def dismiss_unmapped_note(
    project: ActiveProjectDep,
    note_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,
) -> IntakeDismissUnmappedResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    note = await IntakeService.dismiss_unmapped_note(
        db=db,
        project=project,
        note_id=note_id,
    )
    await db.commit()
    return IntakeDismissUnmappedResponse(id=note.id, status="dismissed")


@router.post(
    "/{project_id}/intake/unmapped-notes/dismiss",
    responses={404: {"model": ErrorResponse}},
    summary="Bulk dismiss unmapped notes",
)
async def dismiss_unmapped_notes_bulk(
    project: ActiveProjectDep,
    payload: IntakeDismissUnmappedBulkRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> IntakeDismissUnmappedBulkResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    if payload.scope == "all":
        dismissed_count = await IntakeService.dismiss_all_unmapped(db=db, project=project)
    elif payload.scope == "low_confidence":
        dismissed_count = await IntakeService.dismiss_unmapped_by_confidence(
            db=db,
            project=project,
            max_confidence=payload.max_confidence or 70,
        )
    elif payload.scope == "file":
        dismissed_count = await IntakeService.dismiss_unmapped_by_file(
            db=db,
            project=project,
            source_file_id=payload.source_file_id,
        )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid scope")
    await db.commit()
    return IntakeDismissUnmappedBulkResponse(dismissed_count=dismissed_count)
