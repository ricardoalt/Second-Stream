"""
Incoming material model.
Represents materials a location buys/consumes for operations.
"""

import enum

from sqlalchemy import Column, Enum, ForeignKey, ForeignKeyConstraint, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class IncomingMaterialCategory(enum.StrEnum):
    """Categories for incoming materials."""

    CHEMICALS = "chemicals"
    METALS = "metals"
    WOOD = "wood"
    OIL = "oil"
    PACKAGING = "packaging"
    PLASTICS = "plastics"
    GLASS = "glass"
    PAPER = "paper"
    TEXTILES = "textiles"
    OTHER = "other"


class IncomingMaterial(BaseModel):
    """
    Material that a location buys/consumes for operations.
    Independent from waste streams - tracks operational inputs.
    """

    __tablename__ = "incoming_materials"

    __table_args__ = (
        ForeignKeyConstraint(
            ["location_id", "organization_id"],
            ["locations.id", "locations.organization_id"],
            name="fk_incoming_materials_location_org",
            ondelete="CASCADE",
        ),
        Index("ix_incoming_materials_org_location", "organization_id", "location_id"),
    )

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    location_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    category = Column(
        Enum(
            IncomingMaterialCategory,
            name="incoming_material_category",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
            validate_strings=True,
        ),
        nullable=False,
    )
    volume_frequency = Column(String(255), nullable=False)
    quality_spec = Column(String(500), nullable=True)
    current_supplier = Column(String(255), nullable=True)
    notes = Column(String(1000), nullable=True)

    location = relationship("Location", back_populates="incoming_materials")

    def __repr__(self) -> str:
        """Safe repr that avoids lazy loads."""
        try:
            name = self.__dict__.get("name", "Unknown")
            return f"<IncomingMaterial {name}>"
        except Exception:
            return "<IncomingMaterial (detached)>"
