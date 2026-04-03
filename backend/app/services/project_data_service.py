"""
Service layer for project data management.
Handles JSONB operations and AI serialization.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.api.dependencies import require_not_archived
from app.authz import permissions
from app.authz.authz import Ownership, require_permission
from app.models.project import Project
from app.models.user import User
from app.schemas.project_data import ProjectAIInput


class ProjectDataService:
    """Service for managing flexible project data"""

    @staticmethod
    def deep_merge(base: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
        """
        Deep merge two dictionaries.
        Updates override base, but preserves nested structures.
        """
        result = base.copy()

        for key, value in updates.items():
            if isinstance(value, dict) and key in result and isinstance(result[key], dict):
                result[key] = ProjectDataService.deep_merge(result[key], value)
            else:
                result[key] = value

        return result

    @staticmethod
    def calculate_progress(sections: list[dict[str, Any]] | None) -> int:
        """
        Calculate completion percentage from technical sections.
        Empty values (None, "", []) are not counted as completed.
        """
        if not sections or not isinstance(sections, list):
            return 0

        total = 0
        completed = 0

        for section in sections:
            if not isinstance(section, dict):
                continue
            fields = section.get("fields", [])
            if not isinstance(fields, list):
                continue
            total += len(fields)
            for field in fields:
                value = field.get("value")
                if value is None or value == "" or value == []:
                    continue
                completed += 1

        return round((completed / total) * 100) if total > 0 else 0

    @staticmethod
    async def get_project_data(
        db: AsyncSession,
        project_id: UUID,
        current_user: User,
        org_id: UUID,
    ) -> dict[str, Any]:
        """Get project data with ownership check"""
        result = await db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.organization_id == org_id,
            )
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(404, "Project not found")

        require_permission(
            current_user,
            permissions.PROJECT_READ,
            ownership=Ownership.OWN,
            owner_user_id=project.user_id,
        )

        return project.project_data or {}

    @staticmethod
    async def update_project_data(
        db: AsyncSession,
        project_id: UUID,
        current_user: User,
        org_id: UUID,
        updates: dict[str, Any],
        merge: bool = True,
        commit: bool = True,
    ) -> Project:
        """
        Update project data.

        Args:
            merge: If True, deep merges with existing data.
                   If False, replaces completely.
        """
        result = await db.execute(
            select(Project)
            .where(
                Project.id == project_id,
                Project.organization_id == org_id,
            )
            .with_for_update()
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(404, "Project not found")

        require_permission(
            current_user,
            permissions.PROJECT_DATA_UPDATE,
            ownership=Ownership.OWN,
            owner_user_id=project.user_id,
        )

        require_not_archived(project)

        if merge:
            # Merge with existing data
            current_data = project.project_data or {}
            project.project_data = ProjectDataService.deep_merge(current_data, updates)
        else:
            # Complete replacement
            project.project_data = updates

        flag_modified(project, "project_data")

        should_update_progress = not merge or "technical_sections" in updates
        if should_update_progress:
            raw_sections = project.project_data.get("technical_sections")
            if isinstance(raw_sections, list):
                sections: list[dict[str, Any]] = [
                    {str(key): value for key, value in section.items()}
                    for section in raw_sections
                    if isinstance(section, dict)
                ]
            else:
                sections = []
            project.progress = ProjectDataService.calculate_progress(sections)

        project.updated_at = datetime.now(UTC)

        if commit:
            await db.commit()
            await db.refresh(project)

        return project

    @staticmethod
    def serialize_for_ai(project: Project) -> ProjectAIInput:
        """
        Convert flexible project_data to structured AI input.
        Extracts known fields and preserves custom sections.
        """
        data = {str(key): value for key, value in (project.project_data or {}).items()}

        # Extract structured sections
        def _get_dict(key: str) -> dict[str, Any]:
            value = data.get(key)
            if not isinstance(value, dict):
                return {}
            return {str(inner_key): inner_value for inner_key, inner_value in value.items()}

        basic_info = _get_dict("basic_info")
        consumption = _get_dict("consumption")
        quality = _get_dict("quality")
        requirements = _get_dict("requirements")

        raw_objectives = data.get("objectives")
        if isinstance(raw_objectives, list):
            objectives = [item for item in raw_objectives if isinstance(item, str)]
        else:
            objectives = []

        raw_sections = data.get("sections")
        if isinstance(raw_sections, list):
            custom_sections = [
                {str(key): value for key, value in section.items()}
                for section in raw_sections
                if isinstance(section, dict)
            ]
        else:
            custom_sections = []

        # Build water quality analysis dict
        water_quality_analysis = {}
        water_quality_parameters = []

        for param_name, param_data in quality.items():
            if isinstance(param_data, dict):
                value = param_data.get("value", "")
                unit = param_data.get("unit", "")
                water_quality_analysis[param_name] = f"{value} {unit}".strip()
            else:
                water_quality_analysis[param_name] = str(param_data)

            water_quality_parameters.append(param_name)

        # Format consumption data
        water_consumption_str = None
        if consumption.get("water_consumption"):
            water_consumption_str = f"{consumption['water_consumption']} m³/day"

        wastewater_generation_str = None
        if consumption.get("wastewater_generation"):
            wastewater_generation_str = f"{consumption['wastewater_generation']} m³/day"

        water_cost_str = None
        if consumption.get("water_cost"):
            water_cost_str = f"{consumption['water_cost']} USD/m³"

        # Build AI input
        ai_input = ProjectAIInput(
            # Basic info
            company_name=basic_info.get("company_name"),
            client_contact_info=basic_info.get("client_contact"),
            project_location=basic_info.get("location") or project.location,
            sector_info=basic_info.get("sector") or project.sector,
            subsector_details=basic_info.get("subsector") or project.subsector,
            # Consumption
            water_consumption_data=water_consumption_str,
            wastewater_generation_data=wastewater_generation_str,
            water_cost_data=water_cost_str,
            people_served_data=consumption.get("people_served"),
            # Water quality
            water_quality_analysis=water_quality_analysis,
            water_quality_parameters=water_quality_parameters,
            # Source & usage
            water_source_info=basic_info.get("water_source"),
            water_uses_info=basic_info.get("water_uses"),
            current_discharge_method=basic_info.get("discharge_method"),
            discharge_location=basic_info.get("discharge_location"),
            # Requirements
            regulatory_requirements=requirements.get("regulatory"),
            existing_treatment_systems=requirements.get("existing_treatment"),
            project_constraints=requirements.get("constraints"),
            # Objectives
            project_objectives=objectives,
            # Custom sections
            custom_sections=custom_sections,
            # Raw data backup
            raw_data=data,
        )

        return ai_input

    @staticmethod
    def get_default_structure() -> dict[str, Any]:
        """Get default empty structure for new projects"""
        return {
            "basic_info": {},
            "consumption": {},
            "quality": {},
            "requirements": {},
            "objectives": [],
            "sections": [],
            "offer_v1": {},
        }
