"""Discovery session endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, File, UploadFile, status

from app.api.dependencies import AsyncDB, CurrentBulkImportUser, OrganizationContext
from app.schemas.discovery_session import (
    DiscoverySessionAddTextRequest,
    DiscoverySessionCreateRequest,
    DiscoverySessionResponse,
    DiscoverySourceResponse,
)
from app.services.discovery_session_service import DiscoverySessionService

router = APIRouter()
service = DiscoverySessionService()
logger = structlog.get_logger(__name__)


@router.post("", response_model=DiscoverySessionResponse, status_code=status.HTTP_201_CREATED)
async def create_discovery_session(
    payload: DiscoverySessionCreateRequest,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> DiscoverySessionResponse:
    session = await service.create_session(
        db,
        organization_id=org.id,
        company_id=payload.company_id,
        location_id=payload.location_id,
        user_id=current_user.id,
        assigned_owner_user_id=payload.assigned_owner_user_id,
    )
    await db.commit()
    refreshed = await service.get_session(
        db,
        organization_id=org.id,
        session_id=session.id,
        for_update=True,
    )
    response = await service.build_response(db, session=refreshed)
    await db.commit()
    logger.info(
        "discovery_session_created",
        session_id=str(session.id),
        company_id=str(payload.company_id) if payload.company_id is not None else None,
        location_id=str(payload.location_id) if payload.location_id is not None else None,
    )
    return response


@router.post(
    "/{session_id}/files",
    response_model=DiscoverySourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_discovery_file_source(
    session_id: UUID,
    file: Annotated[UploadFile, File()],
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> DiscoverySourceResponse:
    session = await service.get_session(
        db,
        organization_id=org.id,
        session_id=session_id,
        for_update=True,
    )
    file_bytes = await file.read()
    source = await service.add_file_source(
        db,
        session=session,
        file_name=file.filename or "",
        content_type=file.content_type,
        file_bytes=file_bytes,
    )
    await db.commit()
    return DiscoverySourceResponse.model_validate(source)


@router.post(
    "/{session_id}/audio",
    response_model=DiscoverySourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_discovery_audio_source(
    session_id: UUID,
    audio_file: Annotated[UploadFile, File()],
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> DiscoverySourceResponse:
    session = await service.get_session(
        db,
        organization_id=org.id,
        session_id=session_id,
        for_update=True,
    )
    audio_bytes = await audio_file.read()
    source = await service.add_audio_source(
        db,
        session=session,
        file_name=audio_file.filename or "",
        content_type=audio_file.content_type,
        file_bytes=audio_bytes,
    )
    await db.commit()
    return DiscoverySourceResponse.model_validate(source)


@router.post(
    "/{session_id}/text",
    response_model=DiscoverySourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_discovery_text_source(
    session_id: UUID,
    payload: DiscoverySessionAddTextRequest,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> DiscoverySourceResponse:
    session = await service.get_session(
        db,
        organization_id=org.id,
        session_id=session_id,
        for_update=True,
    )
    source = await service.add_text_source(db, session=session, text=payload.text)
    await db.commit()
    return DiscoverySourceResponse.model_validate(source)


@router.post("/{session_id}/start", response_model=DiscoverySessionResponse)
async def start_discovery_session(
    session_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> DiscoverySessionResponse:
    session = await service.get_session(
        db,
        organization_id=org.id,
        session_id=session_id,
        for_update=True,
    )
    started = await service.start_session(db, session=session, current_user=current_user)
    refreshed = await service.get_session(
        db,
        organization_id=org.id,
        session_id=started.id,
        for_update=True,
    )
    response = await service.build_response(db, session=refreshed)
    await db.commit()
    return response


@router.get("/{session_id}", response_model=DiscoverySessionResponse)
async def get_discovery_session(
    session_id: UUID,
    current_user: CurrentBulkImportUser,
    org: OrganizationContext,
    db: AsyncDB,
) -> DiscoverySessionResponse:
    session = await service.get_session(
        db,
        organization_id=org.id,
        session_id=session_id,
        for_update=False,
    )
    response = await service.build_response(db, session=session)
    await db.commit()
    return response
