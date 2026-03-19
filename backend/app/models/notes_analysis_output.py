"""Structured output model for intake notes analysis agent."""

from pydantic import Field

from app.schemas.common import BaseSchema


class NotesSuggestion(BaseSchema):
    """Suggestion extracted from intake notes (no evidence allowed)."""

    field_id: str
    value: str
    unit: str | None = None
    confidence: int = Field(ge=0, le=100)


class NotesUnmapped(BaseSchema):
    """Intake note snippet that could not map to known fields."""

    extracted_text: str = Field(min_length=1)
    confidence: int = Field(ge=0, le=100)


class NotesAnalysisOutput(BaseSchema):
    suggestions: list[NotesSuggestion] = Field(max_length=20)
    unmapped: list[NotesUnmapped] = Field(max_length=10)

    @staticmethod
    def normalize_confidence(confidence: int) -> int:
        return max(0, min(100, int(confidence)))
