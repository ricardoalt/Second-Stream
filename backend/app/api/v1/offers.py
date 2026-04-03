"""Offer detail endpoints (project-rooted)."""

from fastapi import APIRouter

from app.api.dependencies import ActiveProjectDataEditorDep, ActiveProjectDep, AsyncDB, CurrentUser
from app.authz import permissions
from app.authz.authz import Ownership, require_permission
from app.schemas.offer import OfferDetailDTO
from app.services.offer_service import OfferService

router = APIRouter()


@router.get(
    "/{project_id}/offer",
    summary="Get Offer detail by project",
)
async def get_offer_detail(
    project: ActiveProjectDep,
    current_user: CurrentUser,
    db: AsyncDB,
) -> OfferDetailDTO:
    require_permission(
        current_user,
        permissions.PROJECT_READ,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    return await OfferService.get_offer_detail(db=db, project=project)


@router.post(
    "/{project_id}/offer/refresh-insights",
    summary="Refresh Offer insights",
)
async def refresh_offer_insights(
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    db: AsyncDB,
) -> OfferDetailDTO:
    require_permission(
        current_user,
        permissions.INTAKE_UPDATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    return await OfferService.refresh_offer_insights(
        db=db,
        project=project,
        current_user=current_user,
    )
