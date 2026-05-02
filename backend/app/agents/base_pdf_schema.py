from __future__ import annotations

from pydantic import BaseModel, Field


class BasePdfPayload(BaseModel):
    """Shared base for SecondStream PDF payloads emitted by chat agents."""

    customer: str
    stream: str
    date: str

    header_line: str = Field(
        description=(
            "Rich one-line context for the cover and the per-page header band. "
            "Compose customer + portfolio + sites + in-offer summary so a reader "
            "picks up the situation at a glance, e.g. 'ExxonMobil — Gulf Coast "
            "Spent Caustic Portfolio · Beaumont (2 barges/mo) + GCGV (1 barge/mo) "
            "in offer'. Required."
        ),
    )
    evidence_caption: str | None = Field(
        default=None,
        description=(
            "Optional caption shown beneath the cover subtitle to flag the evidence "
            "and producer-state context, e.g. 'Updated SDS in evidence (June 2024) "
            "· Second Beaumont sample in evidence (April 2026) · Producer offer "
            "received'. Omit when there is nothing notable to surface."
        ),
    )
