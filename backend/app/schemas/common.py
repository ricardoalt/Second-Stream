"""
Common schemas shared across the API.
"""

from datetime import UTC, datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


def to_camel_case(string: str) -> str:
    """
    Convert snake_case to camelCase for API serialization.

    Examples:
        created_at → createdAt
        updated_at → updatedAt
        proposals_count → proposalsCount
    """
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class BaseSchema(BaseModel):
    """
    Base schema with automatic camelCase serialization.

    All response schemas should inherit from this to ensure consistent
    API responses in camelCase format (matching frontend expectations).

    Features:
    - Automatic snake_case to camelCase conversion in JSON responses
    - Accepts both formats on input (populate_by_name=True)
    - Compatible with SQLAlchemy models (from_attributes=True)

    Example:
        class ProjectSummary(BaseSchema):
            created_at: datetime  # Serializes as "createdAt" in JSON
            updated_at: datetime  # Serializes as "updatedAt" in JSON
    """

    model_config = ConfigDict(
        alias_generator=to_camel_case,
        populate_by_name=True,
        from_attributes=True,
        serialize_by_alias=True,  # Always serialize with camelCase
    )


# Generic type for paginated responses
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response matching frontend expectations.

    Frontend expects:
    {
      "items": [...],
      "total": 100,
      "page": 1,
      "size": 20,
      "pages": 5
    }
    """

    items: list[T] = Field(..., description="List of items for current page")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number (1-indexed)")
    size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "size": 20,
                "pages": 5,
            }
        }
    )


class APIError(BaseModel):
    """
    Standard API error response matching frontend expectations.

    Frontend expects:
    {
      "error": {
        "message": "Error message",
        "code": "ERROR_CODE",
        "details": {}
      },
      "timestamp": "2025-09-30T..."
    }
    """

    message: str = Field(..., description="Human-readable error message")
    code: str = Field(..., description="Machine-readable error code")
    details: dict | None = Field(default=None, description="Additional error details")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Project not found",
                "code": "NOT_FOUND",
                "details": {"project_id": "123e4567-e89b-12d3-a456-426614174000"},
            }
        }
    )


class ErrorResponse(BaseModel):
    """Wrapper for error responses with timestamp."""

    error: APIError
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SuccessResponse(BaseModel):
    """Generic success response."""

    success: bool = True
    message: str | None = None
    data: dict | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Operation completed successfully",
                "data": {},
            }
        }
    )
