"""Pydantic schemas for request/response validation."""

from app.schemas.common import APIError, PaginatedResponse, SuccessResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyDetail,
    CompanySummary,
    CompanyUpdate,
)
from app.schemas.location import (
    LocationCreate,
    LocationDetail,
    LocationSummary,
    LocationUpdate,
)
from app.schemas.offer import (
    OfferDetailDTO,
    OfferDocumentMetadataDTO,
    OfferInsightsDTO,
    OfferInsightsFreshnessDTO,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from app.schemas.proposal import (
    ProposalGenerationRequest,
    ProposalJobStatus,
    ProposalResponse,
)

__all__ = [
    "APIError",
    # Company
    "CompanyCreate",
    "CompanyDetail",
    "CompanySummary",
    "CompanyUpdate",
    # Location
    "LocationCreate",
    "LocationDetail",
    "LocationSummary",
    "LocationUpdate",
    "OfferDetailDTO",
    "OfferDocumentMetadataDTO",
    "OfferInsightsDTO",
    "OfferInsightsFreshnessDTO",
    # Common
    "PaginatedResponse",
    # Project
    "ProjectCreate",
    "ProjectDetail",
    "ProjectSummary",
    "ProjectUpdate",
    # Proposal
    "ProposalGenerationRequest",
    "ProposalJobStatus",
    "ProposalResponse",
    "SuccessResponse",
]

# Rebuild models to resolve forward references (circular imports)
CompanyDetail.model_rebuild()
LocationDetail.model_rebuild()
