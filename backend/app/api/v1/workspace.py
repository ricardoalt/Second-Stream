"""Workspace v1 endpoints."""

from fastapi import APIRouter

from app.api.dependencies import ActiveProjectDataEditorDep, ActiveProjectDep, AsyncDB, CurrentUser
from app.authz import permissions
from app.authz.authz import Ownership, require_permission
from app.schemas.workspace import (
    WorkspaceBaseFieldUpdateRequest,
    WorkspaceCompleteDiscoveryResponse,
    WorkspaceConfirmProposalRequest,
    WorkspaceConfirmProposalResponse,
    WorkspaceContextNoteUpdateRequest,
    WorkspaceContextNoteUpdateResponse,
    WorkspaceCustomFieldUpdateRequest,
    WorkspaceHydrateResponse,
    WorkspaceQuestionnaireUpdateRequest,
    WorkspaceQuestionSuggestionReviewRequest,
    WorkspaceQuestionSuggestionReviewResponse,
    WorkspaceRefreshInsightsResponse,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter()


@router.get(
    "/{project_id}/workspace",
    summary="Hydrate workspace v1",
)
async def get_workspace(project: ActiveProjectDep, db: AsyncDB) -> WorkspaceHydrateResponse:
    return await WorkspaceService.get_workspace(db, project)


@router.patch(
    "/{project_id}/workspace/base-fields",
    summary="Update workspace base fields",
)
async def update_workspace_base_fields(
    project: ActiveProjectDataEditorDep,
    payload: WorkspaceBaseFieldUpdateRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceHydrateResponse:
    return await WorkspaceService.update_base_fields(
        db=db,
        project=project,
        current_user=current_user,
        updates=payload.base_fields,
    )


@router.patch(
    "/{project_id}/workspace/context-note",
    summary="Update workspace context note",
)
async def update_workspace_context_note(
    project: ActiveProjectDataEditorDep,
    payload: WorkspaceContextNoteUpdateRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceContextNoteUpdateResponse:
    note = await WorkspaceService.update_context_note(
        db=db,
        project=project,
        current_user=current_user,
        text=payload.text,
    )
    return WorkspaceContextNoteUpdateResponse(text=note.text, updated_at=note.updated_at)


@router.patch(
    "/{project_id}/workspace/custom-fields",
    summary="Update workspace custom fields",
)
async def update_workspace_custom_fields(
    project: ActiveProjectDataEditorDep,
    payload: WorkspaceCustomFieldUpdateRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceHydrateResponse:
    return await WorkspaceService.update_custom_fields(
        db=db,
        project=project,
        current_user=current_user,
        updates=payload.custom_fields,
    )


@router.patch(
    "/{project_id}/workspace/questionnaire",
    summary="Update workspace questionnaire answers",
)
async def update_workspace_questionnaire(
    project: ActiveProjectDataEditorDep,
    payload: WorkspaceQuestionnaireUpdateRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceHydrateResponse:
    return await WorkspaceService.update_questionnaire_answers(
        db=db,
        project=project,
        current_user=current_user,
        updates=payload.answers,
    )


@router.post(
    "/{project_id}/workspace/refresh-insights",
    summary="Refresh workspace insights",
)
async def refresh_workspace_insights(
    project: ActiveProjectDep,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceRefreshInsightsResponse:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    return await WorkspaceService.refresh_insights(db, project, current_user)


@router.post(
    "/{project_id}/workspace/custom-fields/confirm",
    summary="Confirm workspace proposal batch",
)
async def confirm_workspace_custom_fields(
    project: ActiveProjectDataEditorDep,
    payload: WorkspaceConfirmProposalRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceConfirmProposalResponse:
    created_fields, ignored_temp_ids, workspace = await WorkspaceService.confirm_proposals(
        db=db,
        project=project,
        current_user=current_user,
        payload=payload,
    )
    return WorkspaceConfirmProposalResponse(
        created_fields=created_fields,
        ignored_temp_ids=ignored_temp_ids,
        workspace=workspace,
    )


@router.post(
    "/{project_id}/workspace/questionnaire-suggestions/review",
    summary="Review workspace questionnaire AI suggestions",
)
async def review_workspace_questionnaire_suggestions(
    project: ActiveProjectDataEditorDep,
    payload: WorkspaceQuestionSuggestionReviewRequest,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceQuestionSuggestionReviewResponse:
    processed_count, ignored_question_ids, workspace = (
        await WorkspaceService.review_questionnaire_suggestions(
            db=db,
            project=project,
            current_user=current_user,
            payload=payload,
        )
    )
    return WorkspaceQuestionSuggestionReviewResponse(
        processed_count=processed_count,
        ignored_question_ids=ignored_question_ids,
        workspace=workspace,
    )


@router.post(
    "/{project_id}/workspace/complete-discovery",
    summary="Mark workspace discovery complete",
)
async def complete_workspace_discovery(
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    db: AsyncDB,
) -> WorkspaceCompleteDiscoveryResponse:
    return await WorkspaceService.complete_discovery(
        db=db,
        project=project,
        current_user=current_user,
    )
