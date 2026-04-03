"""Structured output model for Offer insights generation."""

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema


class OfferInsightsOutput(BaseSchema):
    summary: str = Field(min_length=1, max_length=3000)
    key_points: list[str] = Field(default_factory=list, max_length=12)
    risks: list[str] = Field(default_factory=list, max_length=12)
    recommendations: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("summary must not be empty")
        return trimmed
