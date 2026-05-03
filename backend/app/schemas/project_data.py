"""
Pydantic schemas for flexible project data.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.offer import OfferV1Data


class WaterQualityParameter(BaseModel):
    """Individual water quality parameter"""

    value: float | None = None
    unit: str | None = None
    notes: str | None = None


class ProjectBasicInfo(BaseModel):
    """Basic project information"""

    company_name: str | None = None
    client_contact: str | None = None
    location: str | None = None
    sector: str | None = None
    subsector: str | None = None
    water_source: str | None = None
    water_uses: str | None = None
    discharge_method: str | None = None
    discharge_location: str | None = None


class ProjectConsumption(BaseModel):
    """Water consumption data"""

    water_consumption: float | None = Field(None, description="m³/day")
    wastewater_generation: float | None = Field(None, description="m³/day")
    water_cost: float | None = Field(None, description="USD/m³")
    people_served: str | None = None


class ProjectRequirements(BaseModel):
    """Project requirements and constraints"""

    regulatory: str | None = None
    existing_treatment: str | None = None
    constraints: str | None = None


class CustomSection(BaseModel):
    """User-defined custom section"""

    id: str
    title: str
    description: str | None = None
    icon: str | None = None
    order: int = 0
    fields: list[dict[str, Any]] = Field(default_factory=list)


class ProjectDataStructure(BaseModel):
    """
    Complete project data structure.
    Flexible - all fields are optional.
    """

    basic_info: ProjectBasicInfo = Field(default_factory=ProjectBasicInfo)
    consumption: ProjectConsumption = Field(default_factory=ProjectConsumption)
    quality: dict[str, Any] = Field(default_factory=dict)
    requirements: ProjectRequirements = Field(default_factory=ProjectRequirements)
    objectives: list[str] = Field(default_factory=list)
    sections: list[CustomSection] = Field(default_factory=list)
    offer_v1: OfferV1Data = Field(default_factory=OfferV1Data)


class ProjectDataUpdate(BaseModel):
    """
    Flexible update model - accepts any structure.
    Backend will merge with existing data.
    """

    data: dict[str, Any] = Field(..., description="Flexible project data")


class ProjectAIInput(BaseModel):
    """
    Structured input for AI agent.
    Extracts known fields + preserves custom data.
    """

    # Basic Info
    company_name: str | None = None
    client_contact_info: str | None = None
    project_location: str | None = None
    sector_info: str | None = None
    subsector_details: str | None = None

    # Consumption
    water_consumption_data: str | None = None
    wastewater_generation_data: str | None = None
    water_cost_data: str | None = None
    people_served_data: str | None = None

    # Water Quality
    water_quality_analysis: dict[str, str] = Field(default_factory=dict)
    water_quality_parameters: list[str] = Field(default_factory=list)

    # Source & Usage
    water_source_info: str | None = None
    water_uses_info: str | None = None
    current_discharge_method: str | None = None
    discharge_location: str | None = None

    # Requirements
    regulatory_requirements: str | None = None
    existing_treatment_systems: str | None = None
    project_constraints: str | None = None

    # Objectives
    project_objectives: list[str] = Field(default_factory=list)

    # Custom sections (user-added data)
    custom_sections: list[dict[str, Any]] = Field(default_factory=list)

    # Raw data backup
    raw_data: dict[str, Any] | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "company_name": "IBYMA",
                "client_contact_info": "Ricardo Marquez",
                "project_location": "Los Mochis",
                "sector_info": "Industrial",
                "subsector_details": "Food and Beverages",
                "water_consumption_data": "350 m³/day",
                "wastewater_generation_data": "242 m³/day",
                "water_cost_data": "7 USD/m³",
                "people_served_data": "20 to 50",
                "water_quality_analysis": {"BOD": "3700 mg/L", "FOG": "150 mg/L"},
                "water_quality_parameters": ["BOD", "FOG"],
                "water_source_info": "Municipal network",
                "water_uses_info": "Cleaning and sanitation",
                "regulatory_requirements": "Compliance with norm 002",
                "existing_treatment_systems": "No existing treatment system",
                "project_constraints": "Regulatory restrictions",
                "current_discharge_method": "To the municipal sewer system",
                "discharge_location": "Municipal sewer",
                "project_objectives": [
                    "Comply with discharge or water quality regulations",
                    "Reduce environmental footprint / Improve sustainability",
                    "Save costs / Achieve a return on investment",
                ],
            }
        },
    )
