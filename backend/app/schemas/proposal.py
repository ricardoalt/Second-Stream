"""
Proposal schemas for AI-generated proposals.

Includes AI transparency schemas for Phase 1 (October 2025).
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, ClassVar, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import BaseSchema

if TYPE_CHECKING:
    from app.models.proposal import Proposal

# Water treatment models removed - now using waste upcycling models
# from app.models.proposal_output import (...)
# All data now in ai_metadata.proposal (single source of truth)


class ProposalGenerationRequest(BaseModel):
    """
    Schema for requesting proposal generation.
    Matches frontend GenerateProposalRequest.
    """

    project_id: UUID
    proposal_type: str = Field(
        ...,
        description="Conceptual, Technical, or Detailed",
    )
    parameters: dict[str, Any] | None = Field(None, description="Additional parameters")
    preferences: dict[str, Any] | None = Field(
        None,
        description="User preferences (focus_areas, constraints)",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "proposal_type": "Technical",
                "preferences": {
                    "focus_areas": ["cost-optimization", "sustainability"],
                    "constraints": {"max_area_m2": 500},
                },
            }
        },
    )


class ProposalPreview(BaseSchema):
    """Preview data for waste upcycling report job result.

    Inherits from BaseSchema to accept camelCase from Redis/frontend.
    Simplified for waste reports - no single CAPEX/OPEX values.
    """

    executive_summary: str = Field(..., max_length=500)
    report_type: str = Field(default="waste_upcycling_feasibility")


class ProposalJobResult(BaseSchema):
    """Result data when proposal generation completes.

    Inherits from BaseSchema to accept camelCase from Redis/frontend.
    """

    proposal_id: UUID
    preview: ProposalPreview


class ProposalJobStatus(BaseSchema):
    """
    Schema for proposal generation job status.
    Matches frontend GetProposalJobStatusResponse.

    Note: Inherits from BaseSchema for camelCase serialization.
    Fields like job_id, current_step serialize as jobId, currentStep.
    """

    job_id: str
    status: str = Field(
        ...,
        description="Job status: queued, processing, completed, failed",
    )
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    current_step: str = Field(..., description="Current processing step")
    result: ProposalJobResult | None = Field(None, description="Result when completed")
    error: str | None = Field(None, description="Error message if failed")


# EquipmentSpec, TreatmentEfficiency, FinancialBreakdown, OperationalCosts
# All imported from proposal_output (lines 13-17)
# No need to redefine them here - using single source of truth


class ProposalResponse(BaseSchema):
    """
    Schema for proposal response (simplified - reads from ai_metadata).

    Structure:
        ai_metadata = {
            "proposal": {
                "technicalData": {...},
                "markdownContent": "...",
                "confidenceLevel": "High",
                "recommendations": [...]
            },
            "transparency": {
                "provenCases": [...],
                "userSector": "...",
                "clientMetadata": {...},
                "generatedAt": "...",
                "generationTimeSeconds": 28.5
            }
        }

    Frontend should read from ai_metadata.proposal.technicalData for all technical details.
    """

    id: UUID
    version: str
    title: str
    proposal_type: str
    status: str
    created_at: datetime
    author: str
    capex: float
    opex: float
    executive_summary: str
    technical_approach: str

    # Single source of truth - all data here
    ai_metadata: dict[str, Any]

    # Files
    pdf_path: str | None = None

    _ALLOWED_STATUSES: ClassVar[set[str]] = {"Draft", "Current", "Archived"}
    _ALLOWED_TYPES: ClassVar[set[str]] = {"Conceptual", "Technical", "Detailed"}

    @classmethod
    def from_model_with_snapshot(cls, proposal: Proposal) -> ProposalResponse:
        """
        Convert a Proposal ORM model to ProposalResponse schema.

        Handles the conversion from SQLAlchemy model to Pydantic schema,
        extracting all necessary fields including ai_metadata.
        """
        response = cls.model_validate(proposal)

        if response.status not in cls._ALLOWED_STATUSES:
            raise ValueError(f"Invalid proposal status: {response.status}")

        if response.proposal_type not in cls._ALLOWED_TYPES:
            raise ValueError(f"Invalid proposal type: {response.proposal_type}")

        if not response.ai_metadata:
            raise ValueError("Proposal ai_metadata is missing")

        return response


# ============================================================================
# AI Transparency Schemas - Phase 1 (October 2025)
# ============================================================================


class UsageStatsResponse(BaseModel):
    """AI usage statistics for transparency."""

    total_tokens: int = Field(..., ge=0, description="Total tokens consumed")
    model_used: str = Field(..., description="AI model used (e.g., gpt-4o-mini)")
    cost_estimate: float | None = Field(None, ge=0, description="Estimated cost in USD")
    generation_time_seconds: float | None = Field(None, ge=0, description="Generation time")
    success: bool = Field(default=True, description="Whether generation succeeded")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_tokens": 45234,
                "model_used": "gpt-4o-mini",
                "cost_estimate": 0.45,
                "generation_time_seconds": 28.5,
                "success": True,
            }
        },
    )


class ProvenCaseResponse(BaseModel):
    """Proven case consulted by AI during generation."""

    case_id: str | None = Field(None, description="Unique case identifier")
    application_type: str = Field(..., description="Application type (e.g., Municipal)")
    treatment_train: str = Field(..., description="Treatment technologies sequence")

    # ✅ Support both flow_rate and flow_range
    flow_rate: float | None = Field(None, ge=0, description="Design flow rate (m³/day)")
    flow_range: str | None = Field(None, description="Flow rate range (e.g., '100-1000 m³/day')")

    capex_usd: float | None = Field(None, ge=0, description="Capital expenditure")
    similarity_score: float | None = Field(
        None, ge=0, le=1, description="Similarity to current project (0-1)"
    )

    @field_validator("similarity_score")
    @classmethod
    def validate_similarity(cls, v: float | None) -> float | None:
        """Ensure similarity score is between 0 and 1."""
        if v is not None and not (0 <= v <= 1):
            raise ValueError("Similarity score must be between 0 and 1")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "case_id": "muni_sbr_uv_500",
                "application_type": "Municipal Wastewater",
                "treatment_train": "SBR + UV Disinfection",
                "flow_rate": 500,
                "flow_range": "100-1000 m³/day",
                "capex_usd": 250000,
                "similarity_score": 0.92,
            }
        },
    )


class AlternativeTechnologyResponse(BaseModel):
    """Alternative technology considered but rejected by AI."""

    technology: str = Field(..., description="Technology name")
    reason_rejected: str = Field(..., description="Why it was not selected")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "technology": "MBBR",
                "reason_rejected": "Higher footprint required for this flow rate",
            }
        },
    )


class TechnologyJustificationResponse(BaseModel):
    """Technical justification for technology selection."""

    stage: str = Field(..., description="Treatment stage (Primary, Secondary, etc.)")
    technology: str = Field(..., description="Technology selected")
    justification: str = Field(..., description="Detailed reasoning")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "stage": "Secondary",
                "technology": "SBR",
                "justification": "Space-efficient biological treatment with proven reliability...",
            }
        },
    )


class AIMetadataResponse(BaseModel):
    """
    AI Transparency Metadata Response - Phase 1 (October 2025)

    Exposes the AI's reasoning process for validation and trust building.
    This response model ensures data integrity and provides clear API contracts.

    **Transparency Features:**
    - Usage stats: Token consumption, model info, costs
    - Proven cases: Similar projects consulted from database
    - Assumptions: Design assumptions made by AI
    - Alternatives: Technologies considered but rejected
    - Justifications: Stage-by-stage technical reasoning
    - Confidence level: AI's confidence in recommendations

    **Validation:**
    All fields are validated at runtime via Pydantic.
    Invalid data from database will raise ValidationError.
    """

    usage_stats: UsageStatsResponse = Field(..., description="Token usage and model info")
    proven_cases: list[ProvenCaseResponse] = Field(
        default_factory=list, description="Proven cases consulted during generation"
    )
    user_sector: str | None = Field(None, description="User's industry sector")
    assumptions: list[str] = Field(
        default_factory=list, description="Design assumptions made by AI"
    )
    alternatives: list[AlternativeTechnologyResponse] = Field(
        default_factory=list, description="Technologies considered but rejected"
    )
    technology_justification: list[TechnologyJustificationResponse] = Field(
        default_factory=list, description="Justifications for each treatment stage"
    )
    confidence_level: Literal["High", "Medium", "Low"] = Field(
        ..., description="AI's confidence in the proposal"
    )
    recommendations: list[str] = Field(
        default_factory=list, description="Additional recommendations from AI"
    )
    generated_at: str = Field(..., description="ISO 8601 timestamp of generation")

    @field_validator("generated_at")
    @classmethod
    def validate_iso_timestamp(cls, v: str) -> str:
        """Validate ISO 8601 timestamp format."""
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValueError("generated_at must be valid ISO 8601 timestamp") from e
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "usage_stats": {
                    "total_tokens": 45234,
                    "model_used": "gpt-4o-mini",
                    "cost_estimate": 0.45,
                    "generation_time_seconds": 28.5,
                    "success": True,
                },
                "proven_cases": [
                    {
                        "case_id": "muni_sbr_uv_500",
                        "application_type": "Municipal Wastewater",
                        "treatment_train": "SBR + UV Disinfection",
                        "flow_rate": 500,
                        "capex_usd": 250000,
                        "similarity_score": 0.92,
                    }
                ],
                "user_sector": "Municipal",
                "assumptions": [
                    "Peak factor of 1.5x for equipment sizing",
                    "COD/BOD ratio assumed as 2.5",
                ],
                "alternatives": [
                    {"technology": "MBBR", "reason_rejected": "Higher footprint required"}
                ],
                "technology_justification": [
                    {
                        "stage": "Secondary",
                        "technology": "SBR",
                        "justification": "Space-efficient biological treatment...",
                    }
                ],
                "confidence_level": "High",
                "recommendations": [
                    "Consider pilot testing for 3 months",
                    "Install backup power system",
                ],
                "generated_at": "2025-10-04T21:00:00.000000Z",
            }
        },
    )
