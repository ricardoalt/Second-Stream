from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.agents.base_pdf_schema import BasePdfPayload
from app.agents.shared_schema import PdfAttachmentOutput as PDFOutput  # noqa: F401
from app.agents.shared_schema import SafetyFlag

CellEmphasis = Literal["normal", "changed", "outlier", "newly_detected"]


class Cell(BaseModel):
    """A single analytical-table cell — value plus optional emphasis.

    Co-locating the display flag with the value (instead of a parallel boolean
    matrix) makes it impossible to desync flags from rows when the model
    reorders or edits the table.
    """

    value: str
    emphasis: CellEmphasis = Field(
        default="normal",
        description=(
            "How the cell should be visually emphasized. 'normal' renders without "
            "tint. 'changed' marks a value that moved meaningfully since the prior "
            "sample. 'outlier' marks an anomalous reading. 'newly_detected' marks "
            "a substance/parameter that was previously below detection."
        ),
    )


class AnalyticalTable(BaseModel):
    title: str
    headers: list[str]
    rows: list[list[Cell]] = Field(
        description=(
            "Rows of cells. Each cell is an object with `value` and optional "
            '`emphasis`. Use plain `{"value": "3.4"}` for normal cells; raise '
            "`emphasis` only on the cells that genuinely deserve attention — "
            "flagging everything teaches the reader to ignore the highlight."
        ),
    )

    @model_validator(mode="after")
    def rows_must_match_headers(self) -> AnalyticalTable:
        header_count = len(self.headers)
        for row_index, row in enumerate(self.rows, start=1):
            cell_count = len(row)
            if cell_count != header_count:
                raise ValueError(
                    "table rows must match headers: "
                    f"row {row_index} has {cell_count} cells but headers has {header_count}"
                )
        return self


class EvidenceTag(BaseModel):
    tag: str = Field(description="Evidence handle, e.g. EV-01.")
    title: str
    description: str
    confidence: str | None = Field(
        default=None, description="HIGH, MEDIUM, LOW, or equivalent confidence language."
    )


class AnalyticalSection(BaseModel):
    title: str
    body: str = ""
    bullets: list[str] = Field(default_factory=list)


class GapItem(BaseModel):
    label: str
    detail: str


class GapSection(BaseModel):
    title: str = Field(
        description="Group label such as REQUIRED, NICE TO HAVE, or REGULATORY FLAG."
    )
    items: list[GapItem] = Field(default_factory=list)


class AnalyticalReadPayload(BasePdfPayload):
    executive_summary: str
    gate_status: Literal["OPEN", "OPEN_CONDITIONAL", "CLOSED"] | None = Field(
        default=None,
        description="Qualification gate status. Must match the vocabulary used by the Ideation Brief.",
    )
    gate_blockers: list[str] = Field(default_factory=list)
    safety_callouts: list[SafetyFlag] = Field(default_factory=list)
    tables: list[AnalyticalTable] = Field(
        default_factory=list,
        description="Ordered analytical tables such as chemistry matrix, treatment fit, buyer matrix, and sizing.",
    )
    evidence_tags: list[EvidenceTag] = Field(default_factory=list)
    narrative_sections: list[AnalyticalSection] = Field(
        default_factory=list,
        description="Ordered narrative sections such as phased commercial scenarios or routing logic.",
    )
    gap_sections: list[GapSection] = Field(default_factory=list)
    strategic_insight: str
