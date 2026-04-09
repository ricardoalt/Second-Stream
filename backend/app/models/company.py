"""Company model - represents client organizations.
A company can have multiple locations (plants, warehouses, etc.).
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
    select,
)
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from app.models.base import BaseModel
from app.models.location import Location


class Company(BaseModel):
    """
    Client company that generates waste streams.

    Example: Honda Manufacturing, Toyota, Bimbo
    """

    __tablename__ = "companies"

    __table_args__ = (UniqueConstraint("id", "organization_id", name="uq_companies_id_org"),)

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    # Basic information
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Automotive, Food & Beverage, etc.",
    )

    # Sector classification (for filtering and reporting)
    sector: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="commercial, industrial, residential, municipal, other",
    )
    subsector: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Specific subsector within the sector (e.g., food_processing, hotel)",
    )

    # Additional info
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        comment="Categorization tags",
    )
    customer_type: Mapped[str] = mapped_column(
        Enum(
            "buyer",
            "generator",
            "both",
            name="customer_type",
            validate_strings=True,
            create_type=False,
        ),
        nullable=False,
        server_default="both",
        index=True,
    )
    account_status: Mapped[str] = mapped_column(
        Enum(
            "active",
            "prospect",
            name="account_status",
            validate_strings=True,
            create_type=False,
        ),
        nullable=False,
        server_default="active",
        index=True,
    )

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

    # Relationships
    locations = relationship(
        "Location",
        back_populates="company",
        foreign_keys=[Location.company_id],
        cascade="all, delete-orphan",
        order_by="Location.name",
        lazy="selectin",  # Eager load locations with company
    )
    contacts = relationship(
        "CompanyContact",
        back_populates="company",
        cascade="all, delete-orphan",
        order_by="CompanyContact.name, CompanyContact.id",
        lazy="selectin",
    )
    organization = relationship("Organization", back_populates="companies")

    def __repr__(self) -> str:
        """Safe repr that doesn't trigger lazy loads or attribute refresh."""
        try:
            # Access __dict__ directly to avoid SQLAlchemy instrumentation
            name = self.__dict__.get("name", "Unknown")
            return f"<Company {name}>"
        except Exception:
            return "<Company (detached)>"


Company.location_count = column_property(
    select(func.count(Location.id))
    .where(
        Location.company_id == Company.id,
        Location.organization_id == Company.organization_id,
        Location.archived_at.is_(None),
    )
    .correlate_except(Location)
    .scalar_subquery(),
    deferred=False,
)
