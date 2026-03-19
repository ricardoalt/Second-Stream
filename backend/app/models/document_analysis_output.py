"""Structured output model for document analysis agent."""

from typing import Annotated, Literal

from pydantic import Field, model_validator

from app.schemas.common import BaseSchema

DocumentBaseFieldId = Literal[
    "material_type",
    "material_name",
    "composition",
    "volume",
    "frequency",
]


class DocumentEvidenceRef(BaseSchema):
    page: int | None = Field(default=None, ge=1, description="1-based page number")
    excerpt: str | None = Field(default=None, max_length=500)


class DocumentBaseProposal(BaseSchema):
    target_kind: Literal["base_field"]
    base_field_id: DocumentBaseFieldId
    answer: str = Field(min_length=1, max_length=2000)
    confidence: int = Field(ge=0, le=100)
    evidence_refs: list[DocumentEvidenceRef] = Field(min_length=1)


class DocumentCustomProposal(BaseSchema):
    target_kind: Literal["custom_field"]
    field_label: str = Field(min_length=1, max_length=120)
    answer: str = Field(min_length=1, max_length=2000)
    confidence: int = Field(ge=0, le=100)
    evidence_refs: list[DocumentEvidenceRef] = Field(min_length=1)


DocumentProposal = Annotated[
    DocumentBaseProposal | DocumentCustomProposal,
    Field(discriminator="target_kind"),
]


class DocumentAnalysisOutput(BaseSchema):
    summary: str | None = None
    proposals: list[DocumentProposal] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize_text_fields(self) -> "DocumentAnalysisOutput":
        if isinstance(self.summary, str):
            self.summary = self.summary.strip() or None

        normalized: list[DocumentProposal] = []
        for proposal in self.proposals:
            proposal.answer = proposal.answer.strip()
            if isinstance(proposal, DocumentCustomProposal):
                proposal.field_label = proposal.field_label.strip()
            for ref in proposal.evidence_refs:
                if isinstance(ref.excerpt, str):
                    ref.excerpt = ref.excerpt.strip() or None
            normalized.append(proposal)
        self.proposals = normalized
        return self

    @staticmethod
    def normalize_confidence(confidence: int) -> int:
        return max(0, min(100, int(confidence)))
