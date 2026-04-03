"""Helpers for project file category rules."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import ProjectFile

OFFER_DOCUMENT_CATEGORY = "offer_document"
SINGLE_ACTIVE_FILE_CATEGORIES = frozenset({OFFER_DOCUMENT_CATEGORY})


def normalize_file_category(category: str | None) -> str:
    value = (category or "general").strip()
    return value or "general"


def category_requires_single_active_file(category: str) -> bool:
    return category in SINGLE_ACTIVE_FILE_CATEGORIES


async def replace_single_active_category_file(
    db: AsyncSession,
    *,
    project_id: UUID,
    organization_id: UUID,
    category: str,
) -> list[ProjectFile]:
    """Delete existing files for categories that allow only one active file."""
    if not category_requires_single_active_file(category):
        return []

    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.project_id == project_id,
            ProjectFile.organization_id == organization_id,
            ProjectFile.category == category,
        )
    )
    existing_files = list(result.scalars().all())
    for existing in existing_files:
        await db.delete(existing)
    return existing_files
