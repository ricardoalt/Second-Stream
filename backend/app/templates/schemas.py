"""
Pydantic schemas for template validation.

These schemas ensure type safety and validation for all templates
before they are used in the system. Catches errors at startup rather
than runtime.
"""

from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from app.templates.registry import TemplateDict

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TemplateField(BaseModel):
    """
    Field in a template - just an ID reference.

    The ID must match a parameter in the frontend parameter-library.
    This schema validates format but doesn't check existence
    (that's handled by contract tests).
    """

    id: str = Field(
        ...,
        min_length=1,
        description="Parameter ID from frontend library (e.g., 'ph', 'water-source')",
        examples=["ph", "water-source", "design-flow-rate"],
    )

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        """
        Validate ID follows naming convention.

        Rules:
        - Lowercase
        - Only alphanumeric, hyphens, underscores
        - No spaces
        - No special characters
        """
        # Convert to lowercase
        v = v.lower()

        # Check format
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError(
                f"Invalid field ID: '{v}'. "
                "Must contain only lowercase letters, numbers, hyphens, and underscores."
            )

        # No leading/trailing hyphens or underscores
        if v.startswith(("-", "_")) or v.endswith(("-", "_")):
            raise ValueError(
                f"Invalid field ID: '{v}'. Cannot start or end with hyphen or underscore."
            )

        return v

    model_config = ConfigDict(
        json_schema_extra={"example": {"id": "ph"}},
    )


class TemplateSection(BaseModel):
    """
    Section in a template.

    Groups related fields together (e.g., "Water Quality", "Project Context").
    Each section must have at least one field.
    """

    id: str = Field(
        ...,
        min_length=1,
        description="Unique section identifier",
        examples=["water-quality", "project-context", "economics-scale"],
    )
    title: str = Field(
        ...,
        min_length=1,
        description="Human-readable section title",
        examples=["Water Quality Parameters", "Project Context"],
    )
    description: str | None = Field(
        None, description="Optional description explaining the section's purpose"
    )
    fields: list[TemplateField] = Field(
        ..., min_length=1, description="List of fields in this section (minimum 1)"
    )

    @field_validator("id")
    @classmethod
    def validate_section_id(cls, v: str) -> str:
        """Validate section ID follows naming convention."""
        v = v.lower()

        if not v.replace("-", "").isalnum():
            raise ValueError(
                f"Invalid section ID: '{v}'. "
                "Must contain only lowercase letters, numbers, and hyphens."
            )

        return v

    @field_validator("fields")
    @classmethod
    def validate_unique_field_ids(cls, v: list[TemplateField]) -> list[TemplateField]:
        """Ensure no duplicate field IDs in a section."""
        field_ids = [f.id for f in v]
        duplicates = [fid for fid in field_ids if field_ids.count(fid) > 1]

        if duplicates:
            unique_dupes = list(set(duplicates))
            raise ValueError(f"Duplicate field IDs found in section: {', '.join(unique_dupes)}")

        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "water-quality",
                "title": "Water Quality Parameters",
                "description": "Basic water quality measurements",
                "fields": [{"id": "ph"}, {"id": "turbidity"}, {"id": "tds"}],
            }
        },
    )


class TemplateConfig(BaseModel):
    """
    Complete template configuration.

    This is the top-level template structure that defines
    what sections and fields appear for a given sector/subsector.

    Templates are materialized (value/source added) before being
    sent to the frontend.
    """

    name: str = Field(
        ...,
        min_length=1,
        description="Human-readable template name",
        examples=["Base Water Treatment Template", "Oil & Gas Water Treatment"],
    )
    description: str = Field(
        ..., min_length=1, description="Description of when to use this template"
    )
    sections: list[TemplateSection] = Field(
        ..., min_length=1, description="List of sections in this template (minimum 1)"
    )

    @field_validator("sections")
    @classmethod
    def validate_unique_section_ids(cls, v: list[TemplateSection]) -> list[TemplateSection]:
        """Ensure no duplicate section IDs in template."""
        section_ids = [s.id for s in v]
        duplicates = [sid for sid in section_ids if section_ids.count(sid) > 1]

        if duplicates:
            unique_dupes = list(set(duplicates))
            raise ValueError(f"Duplicate section IDs found in template: {', '.join(unique_dupes)}")

        return v

    def get_all_field_ids(self) -> list[str]:
        """Get all field IDs across all sections."""
        return [field.id for section in self.sections for field in section.fields]

    def get_field_count(self) -> int:
        """Get total number of fields in template."""
        return sum(len(section.fields) for section in self.sections)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Base Water Treatment Template",
                "description": "Universal template for all water treatment projects",
                "sections": [
                    {
                        "id": "water-quality",
                        "title": "Water Quality",
                        "description": "Basic water quality measurements",
                        "fields": [{"id": "ph"}, {"id": "turbidity"}, {"id": "tds"}],
                    }
                ],
            }
        },
    )


# ============================================================================
# VALIDATION HELPERS
# ============================================================================


class TemplateValidationError(TypedDict):
    sector: str
    subsector: str | None
    error: str


class TemplateValidationResults(TypedDict):
    valid_count: int
    invalid_count: int
    errors: list[TemplateValidationError]


def validate_template(template_dict: "TemplateDict") -> TemplateConfig:
    """
    Validate a template dictionary.

    Args:
        template_dict: Raw template dictionary

    Returns:
        Validated TemplateConfig

    Raises:
        ValidationError: If template is invalid

    Example:
        >>> template = {"name": "Test", "sections": [...]}
        >>> validated = validate_template(template)
        >>> print(validated.get_field_count())
    """
    return TemplateConfig.model_validate(template_dict)


def validate_all_templates(
    templates: dict[tuple[str, str | None], "TemplateDict"],
) -> TemplateValidationResults:
    """
    Validate all templates in registry.

    Args:
        templates: Dictionary of {(sector, subsector): template}

    Returns:
        Dictionary of validation results

    Example:
        >>> from app.templates.registry import TEMPLATES
        >>> results = validate_all_templates(TEMPLATES)
        >>> print(results["valid_count"])
    """
    results: TemplateValidationResults = {"valid_count": 0, "invalid_count": 0, "errors": []}

    for (sector, subsector), template in templates.items():
        try:
            validate_template(template)
            results["valid_count"] += 1
        except Exception as e:
            results["invalid_count"] += 1
            results["errors"].append({"sector": sector, "subsector": subsector, "error": str(e)})

    return results
