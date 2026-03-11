"""
Timeline service for tracking project activity.

Provides a simple helper to create timeline events without repetition.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.timeline import TimelineEvent

# Map backend event types to frontend TimelineEventType
EVENT_TYPE_MAP = {
    "project_created": "version",
    "project_updated": "edit",
    "proposal_generated": "proposal",
    "proposal_follow_up_updated": "proposal",
    "file_uploaded": "upload",
    "file_deleted": "upload",
}


async def create_timeline_event(
    db: AsyncSession,
    project_id: UUID,
    organization_id: UUID,
    event_type: str,
    title: str,
    actor: str,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> TimelineEvent:
    """
    Create and persist a timeline event.

    Args:
        db: Database session
        project_id: Project UUID
        event_type: Backend event type (project_created, proposal_generated, etc.)
        title: Short event title
        actor: User email or identifier
        description: Optional detailed description
        metadata: Optional additional data

    Returns:
        Created TimelineEvent instance

    Note:
        Event type is automatically mapped to frontend format using EVENT_TYPE_MAP.
    """
    # Map to frontend event type
    frontend_type = EVENT_TYPE_MAP.get(event_type, "edit")

    event = TimelineEvent(
        project_id=project_id,
        organization_id=organization_id,
        event_type=frontend_type,
        title=title,
        description=description,
        actor=actor,
        event_metadata=metadata,
    )

    db.add(event)
    return event
