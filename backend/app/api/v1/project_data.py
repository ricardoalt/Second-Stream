"""
API endpoints for flexible project data management.
"""

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Request

from app.api.dependencies import (
    ActiveProjectDataEditorDep,
    AsyncDB,
    CurrentUser,
    OrganizationContext,
    ProjectDep,
)
from app.schemas.common import SuccessResponse
from app.services.project_data_service import ProjectDataService

logger = structlog.get_logger(__name__)

router = APIRouter()

# Import limiter for rate limiting
from app.main import limiter


@router.get("/{project_id}/data")
@limiter.limit("30/minute")  # JSONB read operations - moderate
async def get_project_data(
    request: Request,
    project: ProjectDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: AsyncDB,
):
    """Get all project data (complete JSONB structure)."""
    data = await ProjectDataService.get_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
    )
    return {"project_id": str(project.id), "data": data}


@router.patch("/{project_id}/data")
@limiter.limit("30/minute")
async def update_project_data(
    request: Request,
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    updates: dict[str, Any],
    db: AsyncDB,
    merge: bool = True,
):
    """Update project data (merges by default, set merge=false to replace)."""
    updated = await ProjectDataService.update_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
        updates=updates,
        merge=merge,
    )
    logger.info("project_data_updated", project_id=str(project.id))
    return {
        "message": "Project data updated successfully",
        "project_id": str(project.id),
        "updated_at": updated.updated_at.isoformat(),
        "progress": updated.progress,
    }


@router.put("/{project_id}/data")
@limiter.limit("20/minute")
async def replace_project_data(
    request: Request,
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    data: dict[str, Any],
    db: AsyncDB,
):
    """Replace project data completely (no merge)."""
    updated = await ProjectDataService.update_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
        updates=data,
        merge=False,
    )
    logger.info("project_data_replaced", project_id=str(project.id))
    return {
        "message": "Project data replaced successfully",
        "project_id": str(project.id),
        "updated_at": updated.updated_at.isoformat(),
        "progress": updated.progress,
    }


@router.post("/{project_id}/quality-parameter")
@limiter.limit("30/minute")
async def add_quality_parameter(
    request: Request,
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    parameter_name: str,
    value: float,
    unit: str,
    db: AsyncDB,
):
    """Add/update a water quality parameter."""
    data = await ProjectDataService.get_project_data(
        db=db, project_id=project.id, current_user=current_user, org_id=org.id
    )
    if "quality" not in data:
        data["quality"] = {}
    data["quality"][parameter_name] = {"value": value, "unit": unit}

    await ProjectDataService.update_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
        updates={"quality": data["quality"]},
        merge=True,
    )
    logger.info("quality_parameter_added", parameter=parameter_name, value=value)
    return SuccessResponse(
        message=f"Parameter '{parameter_name}' added successfully",
        data={"parameter": parameter_name, "value": value, "unit": unit},
    )


@router.delete("/{project_id}/quality-parameter/{parameter_name}")
@limiter.limit("30/minute")
async def delete_quality_parameter(
    request: Request,
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    parameter_name: str,
    db: AsyncDB,
):
    """Delete a water quality parameter."""
    data = await ProjectDataService.get_project_data(
        db=db, project_id=project.id, current_user=current_user, org_id=org.id
    )
    quality = data.get("quality", {})
    if parameter_name not in quality:
        raise HTTPException(404, f"Parameter '{parameter_name}' not found")

    del quality[parameter_name]
    await ProjectDataService.update_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
        updates={"quality": quality},
        merge=True,
    )
    logger.info("quality_parameter_deleted", parameter=parameter_name)
    return SuccessResponse(message=f"Parameter '{parameter_name}' deleted successfully")


@router.post("/{project_id}/sections")
@limiter.limit("20/minute")
async def add_custom_section(
    request: Request,
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    section: dict[str, Any],
    db: AsyncDB,
):
    """Add a custom section to the project."""
    data = await ProjectDataService.get_project_data(
        db=db, project_id=project.id, current_user=current_user, org_id=org.id
    )
    sections = data.get("sections", [])
    if "order" not in section:
        section["order"] = len(sections)
    sections.append(section)

    await ProjectDataService.update_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
        updates={"sections": sections},
        merge=True,
    )
    logger.info("section_added", title=section.get("title"))
    return SuccessResponse(message="Section added successfully", data={"section": section})


@router.delete("/{project_id}/sections/{section_id}")
@limiter.limit("20/minute")
async def delete_custom_section(
    request: Request,
    project: ActiveProjectDataEditorDep,
    current_user: CurrentUser,
    org: OrganizationContext,
    section_id: str,
    db: AsyncDB,
):
    """Delete a custom section."""
    data = await ProjectDataService.get_project_data(
        db=db, project_id=project.id, current_user=current_user, org_id=org.id
    )
    sections = data.get("sections", [])
    filtered_sections = [s for s in sections if s.get("id") != section_id]

    if len(sections) == len(filtered_sections):
        raise HTTPException(404, f"Section '{section_id}' not found")

    for idx, section in enumerate(filtered_sections):
        section["order"] = idx

    await ProjectDataService.update_project_data(
        db=db,
        project_id=project.id,
        current_user=current_user,
        org_id=org.id,
        updates={"sections": filtered_sections},
        merge=True,
    )
    logger.info("section_deleted", section_id=section_id)
    return SuccessResponse(message="Section deleted successfully")
