"""
Location model - represents physical sites within a company.
Each location can have multiple waste assessment projects.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Location(BaseModel):
    """
    Physical location/site of a company (plant, warehouse, distribution center).

    Example: Honda Planta Guadalajara, Toyota Centro Logístico Querétaro
    """

    __tablename__ = "locations"

    __table_args__ = (
        UniqueConstraint("id", "organization_id", name="uq_locations_id_org"),
        ForeignKeyConstraint(
            ["company_id", "organization_id"],
            ["companies.id", "companies.organization_id"],
            name="fk_location_company_org",
            ondelete="CASCADE",
        ),
        Index("ix_locations_company_org", "company_id", "organization_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    # Relationship to company
    company_id: Mapped[UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    # Location info
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Plant name or identifier",
    )
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Coordinates for mapping (optional)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Additional info
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    address_type: Mapped[str] = mapped_column(
        Enum(
            "headquarters",
            "pickup",
            "delivery",
            "billing",
            name="address_type",
            validate_strings=True,
            create_type=False,
        ),
        nullable=False,
        server_default="headquarters",
        index=True,
    )
    zip_code: Mapped[str | None] = mapped_column(String(10), nullable=True)

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    locked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Catalog lock timestamp",
    )
    locked_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )
    lock_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    archived_by_parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    company = relationship(
        "Company",
        back_populates="locations",
        foreign_keys=[company_id],
    )
    projects = relationship(
        "Project",
        back_populates="location_rel",  # Fixed: must match Project.location_rel
        foreign_keys="Project.location_id",
        cascade="all, delete-orphan",
        order_by="desc(Project.created_at)",
        lazy="selectin",  # Eager load projects
    )
    contacts = relationship(
        "LocationContact",
        back_populates="location",
        cascade="all, delete-orphan",
        order_by="LocationContact.name",
        lazy="selectin",
    )
    incoming_materials = relationship(
        "IncomingMaterial",
        back_populates="location",
        cascade="all, delete-orphan",
        order_by="IncomingMaterial.name",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        """Safe repr that doesn't trigger lazy loads or attribute refresh."""
        try:
            # Access __dict__ directly to avoid triggering SQLAlchemy instrumentation
            name = self.__dict__.get("name", "Unknown")
            return f"<Location {name}>"
        except Exception:
            return "<Location (detached)>"

    @property
    def full_address(self) -> str:
        """Formatted full address."""
        parts = [self.address, self.city, self.state]
        if self.zip_code:
            parts.append(self.zip_code)
        return ", ".join(p for p in parts if p)

    @property
    def project_count(self) -> int:
        """Default project count (API overrides with RBAC-aware counts)."""
        return 0
