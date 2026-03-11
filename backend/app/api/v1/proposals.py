"""
AI Proposal generation endpoints.

Includes PDF generation and AI transparency features (Oct 2025).
"""

from typing import Annotated, Any, Literal
from uuid import UUID

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    AsyncDB,
    CurrentUser,
    OrganizationContext,
    ProjectArchiveActionDep,
    ProjectDep,
    RateLimitUser30,
    require_not_archived,
)
from app.authz import permissions
from app.authz.authz import (
    Ownership,
    has_any_scope_access,
    raise_org_access_denied,
    raise_resource_not_found,
    require_permission,
)
from app.core.database import get_async_db
from app.main import limiter
from app.models.file import ProjectFile
from app.models.organization import Organization
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.proposal_rating import ProposalRating
from app.models.user import User
from app.schemas.common import ErrorResponse
from app.schemas.proposal import (
    AIMetadataResponse,
    ProposalGenerationRequest,
    ProposalJobStatus,
    ProposalResponse,
)
from app.schemas.proposal_rating import (
    ProposalRatingCriteriaAvg,
    ProposalRatingEnvelope,
    ProposalRatingRead,
    ProposalRatingStatsRead,
    ProposalRatingUpsert,
)
from app.services.proposal_service import (
    ProposalService,
    build_external_markdown_from_data,
    sanitize_external_text,
)
from app.services.s3_service import StorageError, get_presigned_url
from app.services.storage_delete_service import (
    StorageDeleteError,
    delete_storage_keys,
    validate_storage_keys,
)
from app.utils.purge_utils import extract_pdf_paths
from app.visualization.pdf_generator import pdf_generator

logger = structlog.get_logger(__name__)

router = APIRouter()


MIN_RATINGS_FOR_PUBLIC_STATS = 3


def _round_two_decimals(value: float) -> float:
    return round(value, 2)


def _map_rating_read(rating: ProposalRating) -> ProposalRatingRead:
    return ProposalRatingRead(
        coverage_needs_score=rating.coverage_needs_score,
        quality_info_score=rating.quality_info_score,
        business_data_score=rating.business_data_score,
        comment=rating.comment,
        updated_at=rating.updated_at,
    )


async def _resolve_user_organization_for_ratings(
    *,
    db: AsyncSession,
    current_user: User,
) -> Organization:
    if current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin cannot access user rating endpoints",
        )

    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not assigned to any organization",
        )

    org = await db.get(Organization, current_user.organization_id)
    if not org or not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User's organization is inactive",
        )

    return org


async def _get_accessible_project_for_ratings(
    *,
    db: AsyncSession,
    project_id: UUID,
    current_user: User,
    organization_id: UUID,
) -> Project:
    require_permission(current_user, permissions.PROPOSAL_READ)
    conditions = [
        Project.id == project_id,
        Project.organization_id == organization_id,
    ]
    if not has_any_scope_access(current_user, permissions.PROPOSAL_READ):
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(select(Project).where(*conditions))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


async def _get_project_in_scope_for_ratings(
    *,
    db: AsyncSession,
    project_id: UUID,
    organization_id: UUID,
) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == organization_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


async def _get_project_in_scope_or_raise(
    *,
    db: AsyncSession,
    project_id: UUID,
    organization_id: UUID,
) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == organization_id,
        )
    )
    project = result.scalar_one_or_none()
    if project is not None:
        return project

    cross_tenant_probe = await db.get(Project, project_id)
    if cross_tenant_probe is not None:
        raise_org_access_denied(org_id=str(organization_id))
    raise_resource_not_found("Project not found", details={"project_id": str(project_id)})


async def _get_project_proposal_for_ratings(
    *,
    db: AsyncSession,
    project_id: UUID,
    proposal_id: UUID,
    organization_id: UUID,
) -> Proposal:
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project_id,
            Proposal.organization_id == organization_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    return proposal


def _resolve_comment(
    *,
    payload: ProposalRatingUpsert,
) -> tuple[bool, str | None]:
    if "comment" not in payload.model_fields_set:
        return False, None

    if payload.comment is None or payload.comment == "":
        return True, None

    return True, payload.comment


@router.put(
    "/{project_id}/proposals/{proposal_id}/rating",
    response_model=ProposalRatingEnvelope,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Upsert current user proposal rating",
)
async def upsert_proposal_rating(
    project_id: UUID,
    proposal_id: UUID,
    payload: ProposalRatingUpsert,
    current_user: CurrentUser,
    db: AsyncDB,
    _rate_limit: RateLimitUser30,
):
    org = await _resolve_user_organization_for_ratings(db=db, current_user=current_user)
    project = await _get_project_in_scope_for_ratings(
        db=db,
        project_id=project_id,
        organization_id=org.id,
    )
    require_permission(
        current_user,
        permissions.PROPOSAL_RATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    proposal = await _get_project_proposal_for_ratings(
        db=db,
        project_id=project.id,
        proposal_id=proposal_id,
        organization_id=org.id,
    )

    if project.archived_at is not None or proposal.status == "Archived":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project or proposal is archived",
        )

    comment_provided, comment = _resolve_comment(payload=payload)

    insert_values: dict[str, object | None] = {
        "organization_id": org.id,
        "proposal_id": proposal.id,
        "user_id": current_user.id,
        "coverage_needs_score": payload.coverage_needs_score,
        "quality_info_score": payload.quality_info_score,
        "business_data_score": payload.business_data_score,
        "comment": comment if comment_provided else None,
    }
    update_values: dict[str, object | None] = {
        "coverage_needs_score": payload.coverage_needs_score,
        "quality_info_score": payload.quality_info_score,
        "business_data_score": payload.business_data_score,
        "updated_at": func.now(),
    }
    if comment_provided:
        update_values["comment"] = comment

    stmt = (
        insert(ProposalRating)
        .values(**insert_values)
        .on_conflict_do_update(
            index_elements=[
                ProposalRating.organization_id,
                ProposalRating.proposal_id,
                ProposalRating.user_id,
            ],
            set_=update_values,
        )
        .returning(ProposalRating)
    )
    result = await db.execute(stmt)
    rating = result.scalar_one()

    await db.commit()

    return ProposalRatingEnvelope(rating=_map_rating_read(rating))


@router.get(
    "/{project_id}/proposals/{proposal_id}/rating",
    response_model=ProposalRatingEnvelope,
    responses={404: {"model": ErrorResponse}},
    summary="Get current user proposal rating",
)
async def get_proposal_rating(
    project_id: UUID,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,
):
    org = await _resolve_user_organization_for_ratings(db=db, current_user=current_user)
    project = await _get_accessible_project_for_ratings(
        db=db,
        project_id=project_id,
        current_user=current_user,
        organization_id=org.id,
    )
    proposal = await _get_project_proposal_for_ratings(
        db=db,
        project_id=project.id,
        proposal_id=proposal_id,
        organization_id=org.id,
    )

    result = await db.execute(
        select(ProposalRating).where(
            ProposalRating.organization_id == org.id,
            ProposalRating.proposal_id == proposal.id,
            ProposalRating.user_id == current_user.id,
        )
    )
    rating = result.scalar_one_or_none()

    return ProposalRatingEnvelope(rating=_map_rating_read(rating) if rating else None)


@router.get(
    "/{project_id}/proposals/{proposal_id}/rating/stats",
    response_model=ProposalRatingStatsRead,
    responses={404: {"model": ErrorResponse}},
    summary="Get proposal rating aggregate stats",
)
async def get_proposal_rating_stats(
    project_id: UUID,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,
):
    org = await _resolve_user_organization_for_ratings(db=db, current_user=current_user)
    project = await _get_accessible_project_for_ratings(
        db=db,
        project_id=project_id,
        current_user=current_user,
        organization_id=org.id,
    )
    proposal = await _get_project_proposal_for_ratings(
        db=db,
        project_id=project.id,
        proposal_id=proposal_id,
        organization_id=org.id,
    )

    aggregates = await db.execute(
        select(
            func.count(ProposalRating.id).label("rating_count"),
            func.avg(ProposalRating.coverage_needs_score).label("coverage_needs_avg"),
            func.avg(ProposalRating.quality_info_score).label("quality_info_avg"),
            func.avg(ProposalRating.business_data_score).label("business_data_avg"),
        ).where(
            ProposalRating.organization_id == org.id,
            ProposalRating.proposal_id == proposal.id,
        )
    )
    row = aggregates.one()
    rating_count = int(row.rating_count or 0)

    if rating_count < MIN_RATINGS_FOR_PUBLIC_STATS:
        return ProposalRatingStatsRead(
            visible=False,
            rating_count=rating_count,
            minimum_required_count=MIN_RATINGS_FOR_PUBLIC_STATS,
            overall_avg=None,
            criteria_avg=None,
        )

    coverage_needs_avg_raw = float(row.coverage_needs_avg or 0.0)
    quality_info_avg_raw = float(row.quality_info_avg or 0.0)
    business_data_avg_raw = float(row.business_data_avg or 0.0)

    coverage_needs_avg = _round_two_decimals(coverage_needs_avg_raw)
    quality_info_avg = _round_two_decimals(quality_info_avg_raw)
    business_data_avg = _round_two_decimals(business_data_avg_raw)
    overall_avg = _round_two_decimals(
        (coverage_needs_avg_raw + quality_info_avg_raw + business_data_avg_raw) / 3
    )

    return ProposalRatingStatsRead(
        visible=True,
        rating_count=rating_count,
        minimum_required_count=MIN_RATINGS_FOR_PUBLIC_STATS,
        overall_avg=overall_avg,
        criteria_avg=ProposalRatingCriteriaAvg(
            coverage_needs_avg=coverage_needs_avg,
            quality_info_avg=quality_info_avg,
            business_data_avg=business_data_avg,
        ),
    )


@router.post(
    "/generate",
    response_model=ProposalJobStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate AI proposal",
    description="Start an async job to generate a proposal using AI",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("3/minute")  # ⭐ Rate limit: AI generation (expensive operation)
async def generate_proposal(
    request: Request,  # Required for rate limiter
    proposal_request: ProposalGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Start AI-powered proposal generation for a project.

    **This is an async operation.** The endpoint returns immediately with a job ID.
    Use the job ID to poll for status and results.

    **Workflow:**
    1. Request submitted → Returns `job_id` with status "queued"
    2. Background worker processes request
    3. AI generates comprehensive proposal (1-2 minutes)
    4. Proposal saved to database
    5. Job status becomes "completed" with proposal ID

    **Polling:**
    - Poll `GET /ai/proposals/jobs/{jobId}` every 2-3 seconds
    - Monitor `progress` (0-100) and `current_step`
    - When status="completed", retrieve `result.proposal_id`

    **Requirements:**
    - Project must exist and belong to current user
    - Project should have technical data filled

    **Parameters:**
    - **project_id**: UUID of the project
    - **proposal_type**: "Conceptual", "Technical", or "Detailed"
    - **preferences**: Optional preferences (focus_areas, constraints)

    **Returns:**
    - **job_id**: Unique identifier for tracking this generation job
    - **status**: "queued" (initial state)
    - **estimated_time**: Estimated completion time in seconds
    """
    result = await db.execute(
        select(Project).where(
            Project.id == proposal_request.project_id,
            Project.organization_id == org.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    require_permission(
        current_user,
        permissions.PROPOSAL_GENERATE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    require_not_archived(project)

    # Start proposal generation
    try:
        job_id = await ProposalService.start_proposal_generation(
            db=db,
            project_id=proposal_request.project_id,
            request=proposal_request,
            org_id=org.id,
            user_id=current_user.id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Job status unavailable") from exc

    # Add background task for processing
    # Note: In production, this should be handled by Celery or similar
    # IMPORTANT: Don't pass db session - background task will create its own
    background_tasks.add_task(
        ProposalService.generate_proposal_async_wrapper,
        project_id=proposal_request.project_id,
        request=proposal_request,
        job_id=job_id,
        org_id=org.id,
        user_id=current_user.id,
    )

    logger.info(
        "Proposal generation started: %s for project %s",
        job_id,
        proposal_request.project_id,
    )

    return ProposalJobStatus(
        job_id=job_id,
        status="queued",
        progress=0,
        current_step="Initializing proposal generation...",
        result=None,
        error=None,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=ProposalJobStatus,
    responses={404: {"model": ErrorResponse}},
    summary="Get proposal generation job status",
)
# Rate limiting removed: This endpoint is polled frequently (every 2.5s)
# and already protected by authentication (CurrentUser)
async def get_job_status(
    job_id: str,
    current_user: CurrentUser,
    org: OrganizationContext,
):
    """
    Get the current status of a proposal generation job.

    **Poll this endpoint** every 2-3 seconds after submitting a generation request.

    **Status values:**
    - **queued**: Job is waiting to be processed
    - **processing**: AI is generating the proposal
    - **completed**: Proposal is ready (check `result` for proposal_id)
    - **failed**: Generation failed (check `error` for details)

    **Progress tracking:**
    - `progress`: 0-100 percentage
    - `current_step`: Human-readable description of current operation

    **When completed:**
    - `result.proposal_id`: UUID of the generated proposal
    - `result.preview`: Quick preview with summary and report type

    **Example usage:**
    ```javascript
    // Poll every 2 seconds
    const checkStatus = async (jobId) => {
      const response = await fetch(`/api/v1/ai/proposals/jobs/${jobId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        // Navigate to proposal
        navigate(`/projects/${projectId}/proposals/${data.result.proposal_id}`);
      } else if (data.status === 'failed') {
        // Show error
        showError(data.error);
      } else {
        // Show progress
        updateProgressBar(data.progress);
        showMessage(data.current_step);
        // Poll again
        setTimeout(() => checkStatus(jobId), 2000);
      }
    };
    ```
    """
    try:
        status_data = await ProposalService.get_job_status(
            job_id=job_id,
            org_id=org.id,
            user_id=current_user.id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Job status unavailable") from exc

    if not status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or expired",
        )

    return ProposalJobStatus(**status_data)


@router.get(
    "/{project_id}/proposals",
    response_model=list[ProposalResponse],
    responses={404: {"model": ErrorResponse}},
    summary="List project proposals",
)
async def list_proposals(
    project: ProjectDep,
):
    """
    Get all proposals for a project.

    Returns proposals ordered by creation date (newest first).
    Each proposal includes version, costs, and status.
    """
    # Get proposals (relationship already loaded via selectin)
    proposals = project.proposals

    # Convert to response models with snapshot using helper method
    response_list = [ProposalResponse.from_model_with_snapshot(p) for p in proposals]

    return response_list


@router.get(
    "/{project_id}/proposals/{proposal_id}",
    response_model=ProposalResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get proposal detail",
)
async def get_proposal(
    project: ProjectDep,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Get detailed proposal information.

    Includes full markdown content, equipment specs, costs, and efficiency data.
    """
    # Find proposal
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    # Regenerate fresh image URLs for photo insights (presigned URLs expire)
    try:
        ai_meta = proposal.ai_metadata
        if not isinstance(ai_meta, dict):
            ai_meta = {}

        def _coerce_dict(value: object) -> dict[str, object]:
            if not isinstance(value, dict):
                return {}
            return {str(key): item for key, item in value.items()}

        transparency = _coerce_dict(ai_meta.get("transparency"))
        if transparency:
            client_meta = _coerce_dict(transparency.get("clientMetadata"))
            if client_meta:
                attachments = _coerce_dict(client_meta.get("attachmentsSummary"))
                if attachments:
                    photo_insights_value = attachments.get("photoInsights")
                    if isinstance(photo_insights_value, list):
                        refreshed_insights: list[dict[str, object]] = []
                        for insight in photo_insights_value:
                            if not isinstance(insight, dict):
                                continue
                            insight_data = {str(key): value for key, value in insight.items()}
                            file_id = insight_data.get("fileId")
                            if not file_id:
                                refreshed_insights.append(insight_data)
                                continue
                            try:
                                file_uuid = UUID(str(file_id))
                            except Exception:
                                refreshed_insights.append(insight_data)
                                continue
                            file = await db.get(ProjectFile, file_uuid)
                            if not file:
                                refreshed_insights.append(insight_data)
                                continue
                            if file.organization_id != project.organization_id:
                                refreshed_insights.append(insight_data)
                                continue
                            image_url = await get_presigned_url(file.file_path, expires=86400)
                            if image_url:
                                insight_data["imageUrl"] = image_url
                            refreshed_insights.append(insight_data)
                        if refreshed_insights:
                            attachments["photoInsights"] = refreshed_insights
                            client_meta["attachmentsSummary"] = attachments
                            transparency["clientMetadata"] = client_meta
                            ai_meta["transparency"] = transparency
                            proposal.ai_metadata = ai_meta
    except Exception as exc:  # Best-effort refresh; do not block response
        logger.warning("photo_insight_refresh_failed", exc_info=True, error=str(exc))

    # Build response with snapshot using helper method
    return ProposalResponse.from_model_with_snapshot(proposal)


@router.get(
    "/{project_id}/proposals/{proposal_id}/pdf",
    summary="Generate or retrieve a proposal PDF URL",
    responses={
        200: {"description": "PDF URL returned successfully"},
        404: {"model": ErrorResponse, "description": "Proposal not found"},
        409: {"model": ErrorResponse, "description": "Project is archived"},
        500: {"model": ErrorResponse, "description": "PDF generation failed"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit("20/minute")  # ⭐ Rate limit: PDF generation (moderate - uses cache)
async def get_proposal_pdf(
    request: Request,  # Required for rate limiter
    project: ProjectDep,
    proposal_id: UUID,
    current_user: CurrentUser,  # CurrentUser already has Depends in type
    db: Annotated[AsyncSession, Depends(get_async_db)],
    regenerate: bool = False,
    audience: Literal["internal", "external"] = "internal",
):
    """
    Generate and retrieve a presigned URL for proposal PDF.

    **On-demand generation with caching:**
    - First request: Generates PDF and saves to storage (S3 or local)
    - Subsequent requests: Returns cached PDF URL from storage
    - Use `?regenerate=true` to force regeneration

    **Parameters:**
    - **regenerate**: Force PDF regeneration (default: false)
    - **audience**: "internal" or "external" (default: internal)

    **Returns:**
    - JSON object with `url` field containing presigned URL
    - Frontend should use `window.open(url)` to download
    """
    # Get proposal with relationships
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    try:
        ai_metadata = proposal.ai_metadata if isinstance(proposal.ai_metadata, dict) else {}
        pdf_paths_value = ai_metadata.get("pdfPaths")
        pdf_paths = (
            {
                key: value
                for key, value in pdf_paths_value.items()
                if isinstance(key, str) and isinstance(value, str)
            }
            if isinstance(pdf_paths_value, dict)
            else {}
        )

        cached_pdf_path = proposal.pdf_path if audience == "internal" else pdf_paths.get("external")
        is_archived = project.archived_at is not None

        # Check if PDF exists and regeneration not requested
        if cached_pdf_path and not regenerate:
            logger.info(
                "Serving cached PDF for proposal %s (audience=%s)",
                proposal_id,
                audience,
            )

            # Generate fresh presigned URL or serve local path
            try:
                pdf_url = await get_presigned_url(cached_pdf_path, expires=3600)
            except StorageError as exc:
                if is_archived:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Project is archived",
                    ) from exc
                logger.warning("cached_pdf_unavailable", error=str(exc))
                pdf_url = ""

            if pdf_url:
                return {"url": pdf_url}
            if is_archived:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Project is archived",
                )

        if is_archived:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Project is archived",
            )

        # Generate new PDF using existing ProfessionalPDFGenerator
        logger.info("Generating new PDF for proposal %s", proposal_id)

        # Prepare metadata for PDF generator.
        # metadata["proposal"] uses audience-specific data when available.
        markdown_content: str = ""

        def _coerce_dict(value: object) -> dict[str, Any]:
            if not isinstance(value, dict):
                return {}
            return {str(key): item for key, item in value.items()}

        internal_data: dict[str, Any] = {}
        proposal_data: dict[str, Any] | None = None

        if ai_metadata:
            internal_data = _coerce_dict(ai_metadata.get("proposal"))
            external_data = _coerce_dict(ai_metadata.get("proposalExternal"))
            if audience == "internal":
                proposal_data = internal_data
            elif external_data:
                proposal_data = external_data

            markdown_key = "markdownExternal" if audience == "external" else "markdownInternal"
            markdown_value = ai_metadata.get(markdown_key)
            if isinstance(markdown_value, str):
                markdown_content = markdown_value

        if audience == "external":
            if not proposal_data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="External report not available for this proposal.",
                )
            if not markdown_content and proposal_data is not None:
                markdown_content = build_external_markdown_from_data(proposal_data)
                ai_metadata["markdownExternal"] = markdown_content
                proposal.ai_metadata = ai_metadata
        else:
            if not markdown_content:
                markdown_content = proposal.technical_approach or ""

        legacy_technical = getattr(proposal, "technical_data", None)
        context: dict[str, object] = {}
        if audience == "external" and internal_data:
            # Basic context fields
            context["material"] = sanitize_external_text(internal_data.get("material"))
            context["volume"] = sanitize_external_text(internal_data.get("volume"))
            context["location"] = sanitize_external_text(
                internal_data.get("location") or project.location
            )
            context["facilityType"] = sanitize_external_text(
                internal_data.get("facilityType") or project.sector
            )

            # Enrichment: sanitized pathway data for Valorization/ESG sections
            pathways_value = internal_data.get("pathways")
            if isinstance(pathways_value, list) and pathways_value:
                pathways = [p for p in pathways_value if isinstance(p, dict)]
                # Valorization options: action + why_it_works (no prices)
                valorization = []
                for p in pathways[:3]:
                    action = sanitize_external_text(p.get("action"))
                    why = sanitize_external_text(p.get("whyItWorks"))
                    if action and why and why != "Details available upon request.":
                        valorization.append({"action": action, "rationale": why})
                if valorization:
                    context["valorization"] = valorization

                # ESG benefits: esg_pitch (filtered for sensitive data)
                esg_benefits = []
                for p in pathways[:3]:
                    pitch = sanitize_external_text(p.get("esgPitch"))
                    if pitch and pitch != "Details available upon request.":
                        esg_benefits.append(pitch)
                if esg_benefits:
                    context["esgBenefits"] = esg_benefits

                # Feasibility summary: count of viable pathways
                high_count = sum(1 for p in pathways if p.get("feasibility") == "High")
                med_count = sum(1 for p in pathways if p.get("feasibility") == "Medium")
                context["viablePathwaysCount"] = high_count + med_count

        metadata = {
            "proposal": proposal_data or {},
            "audience": audience,
            "client_name": project.client,
            "client_location": project.location,
            "context": context,
            "data_for_charts": legacy_technical
            if legacy_technical is not None and audience == "internal"
            else {
                "client_info": {
                    "company_name": project.client,
                    "industry": project.sector,
                    "location": project.location,
                },
                "flow_rate_m3_day": 0,  # Kept for backward-compatible charts
                "capex_usd": proposal.capex,
                "annual_opex_usd": proposal.opex,
                "main_equipment": getattr(proposal, "equipment_list", None) or [],
                "treatment_efficiency": getattr(proposal, "treatment_efficiency", None) or {},
                "capex_breakdown": getattr(proposal, "cost_breakdown", None) or {},
                "opex_breakdown": getattr(proposal, "operational_costs", None) or {},
                "problem_analysis": {},
                "alternative_analysis": [],
                "implementation_months": 12,
            }
            if audience == "internal"
            else {},
        }

        charts = {}
        if audience == "internal":
            # Generate charts before creating PDF (like backend-chatbot)
            from app.visualization.modern_charts import premium_chart_generator

            logger.info("Generating executive charts for proposal %s", proposal_id)
            charts = premium_chart_generator.generate_executive_charts(metadata)
            logger.info(
                "Generated %s charts: %s",
                len(charts),
                list(charts.keys()) if charts else "none",
            )

        # Generate PDF with charts (returns relative filename: "proposals/file.pdf")
        markdown_text = markdown_content if isinstance(markdown_content, str) else ""
        pdf_filename = await pdf_generator.create_pdf(
            markdown_content=markdown_text,
            metadata=metadata,
            charts=charts,
            conversation_id=str(proposal_id),
        )

        if not pdf_filename:
            raise ValueError("PDF generation returned None")

        # Save relative filename in database (not the full URL)
        if audience == "internal":
            proposal.pdf_path = pdf_filename
        else:
            pdf_paths["external"] = pdf_filename
            ai_metadata["pdfPaths"] = pdf_paths
            proposal.ai_metadata = ai_metadata

        lock_result = await db.execute(
            select(Project)
            .where(
                Project.id == project.id,
                Project.organization_id == project.organization_id,
            )
            .with_for_update()
        )
        locked_project = lock_result.scalar_one_or_none()
        if not locked_project:
            try:
                await delete_storage_keys([pdf_filename])
            except Exception as exc:
                logger.warning(
                    "pdf_cleanup_failed_after_project_missing",
                    error=str(exc),
                    key=pdf_filename,
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        try:
            require_not_archived(locked_project)
        except HTTPException:
            try:
                await delete_storage_keys([pdf_filename])
            except Exception as exc:
                logger.warning(
                    "pdf_cleanup_failed_after_archive",
                    error=str(exc),
                    key=pdf_filename,
                )
            raise

        await db.commit()

        logger.info("PDF generated and saved: %s", pdf_filename)

        # Generate download URL from relative filename
        # In local mode: returns "/uploads/proposals/file.pdf"
        # In S3 mode: returns presigned S3 URL
        pdf_url = await get_presigned_url(pdf_filename, expires=3600)

        if not pdf_url:
            raise ValueError("Failed to generate download URL")

        return {"url": pdf_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("PDF generation failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {e!s}",
        ) from e


@router.delete(
    "/{project_id}/proposals/{proposal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "Proposal deleted successfully"},
        404: {"model": ErrorResponse, "description": "Proposal not found"},
        403: {"model": ErrorResponse, "description": "Not authorized to delete this proposal"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
    summary="Delete a proposal",
    description="Permanently delete a proposal and its associated PDF file. Only the project owner can delete proposals.",
)
@limiter.limit("10/minute")  # ⭐ Rate limit: Delete operation (conservative)
async def delete_proposal(
    request: Request,  # Required for rate limiter
    project: ProjectArchiveActionDep,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Delete a proposal permanently.

    **Security:**
    - Only the project owner can delete proposals
    - Cascading delete removes all associated data
    - PDF files are deleted from storage (S3 or local)

    **Best Practices (October 2025):**
    - Returns 204 No Content on success (RESTful standard)
    - Returns 404 if proposal doesn't exist (prevents info leakage)
    - Atomic operation (DB + file deletion)
    """
    require_permission(
        current_user,
        permissions.PROPOSAL_DELETE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )

    # Get proposal
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    lock_result = await db.execute(
        select(Project)
        .where(
            Project.id == project.id,
            Project.organization_id == project.organization_id,
        )
        .with_for_update()
    )
    locked_project = lock_result.scalar_one_or_none()
    if not locked_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    require_not_archived(locked_project)

    # Store paths before deleting (for cleanup)
    storage_keys = []
    if proposal.pdf_path:
        storage_keys.append(proposal.pdf_path)
        storage_keys.extend(extract_pdf_paths(proposal.ai_metadata))
    try:
        validate_storage_keys(storage_keys)
    except StorageDeleteError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Delete from database (SQLAlchemy will handle cascade)
    remaining_proposals = await db.scalar(
        select(func.count(Proposal.id)).where(
            Proposal.project_id == locked_project.id,
            Proposal.organization_id == locked_project.organization_id,
            Proposal.id != proposal.id,
        )
    )
    if int(remaining_proposals or 0) == 0:
        locked_project.proposal_follow_up_state = None
    await db.delete(proposal)
    await db.commit()

    # Delete PDF file from storage (best effort - don't fail if file doesn't exist)
    if storage_keys:
        try:
            await delete_storage_keys(storage_keys)
        except Exception as exc:
            logger.warning("proposal_pdf_delete_failed", error=str(exc))

    logger.info("Deleted proposal %s from project %s", proposal_id, project.id)

    # Return 204 No Content (RESTful standard for successful DELETE)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{project_id}/proposals/{proposal_id}/ai-metadata",
    response_model=AIMetadataResponse,
    responses={
        200: {"model": AIMetadataResponse},
        404: {"model": ErrorResponse, "description": "Proposal not found"},
        422: {"model": ErrorResponse, "description": "Invalid metadata format"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
    summary="Get AI reasoning and transparency data",
    description="Retrieve validated AI metadata including proven cases, assumptions, and confidence level",
)
@limiter.limit("60/minute")  # ⭐ Rate limit: Read operation (permissive)
async def get_proposal_ai_metadata(
    request: Request,  # Required for rate limiter
    project_id: UUID,
    proposal_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Get AI reasoning and transparency metadata for a proposal.

    **Transparency Features (Engineering Co-Pilot):**
    This endpoint exposes the "why" behind the AI's decisions, enabling
    engineers to validate, trust, and improve the proposal.

    **Data Included:**
    - **usage_stats**: Token usage, model info, generation time
    - **proven_cases**: Similar projects consulted during generation
    - **assumptions**: Design assumptions made by the AI
    - **alternatives**: Technologies considered but rejected
    - **technology_justification**: Detailed reasoning for selections
    - **confidence_level**: AI's confidence ("High", "Medium", "Low")
    - **recommendations**: Additional recommendations from AI

    **Use Cases:**
    1. **Validation Tab**: Show proven cases and deviations in UI
    2. **Q&A Context**: Use for contextual chat with proposal
    3. **Audit Trail**: Document AI decision-making process
    4. **Learning**: Understand AI reasoning to improve inputs

    **Example Response:**
    ```json
    {
      "usage_stats": {
        "total_tokens": 45000,
        "model_used": "gpt-4o-mini",
        "success": true
      },
      "proven_cases": [
        {
          "sector": "Food & Beverage",
          "treatment_train": "DAF + UASB + UV",
          "capex_usd": 180000,
          "flow_rate_m3_day": 350
        }
      ],
      "assumptions": [
        "COD/BOD ratio of 2.5 based on F&B industry standards",
        "Peak factor of 1.5x for equipment sizing"
      ],
      "confidence_level": "High"
    }
    ```

    **Frontend Integration:**
    Use this data in a "Validation" or "AI Insights" tab to show
    engineers the reasoning behind the proposal.
    """
    project = await _get_project_in_scope_or_raise(
        db=db,
        project_id=project_id,
        organization_id=org.id,
    )
    require_permission(
        current_user,
        permissions.PROPOSAL_READ,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )

    # Get proposal
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    # Get AI metadata directly from PostgreSQL (single source of truth)
    ai_metadata = proposal.ai_metadata

    if not isinstance(ai_metadata, dict) or not ai_metadata:
        logger.warning("No AI metadata found for proposal %s", proposal_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI metadata available for this proposal.",
        )

    ai_metadata_data = {str(key): value for key, value in ai_metadata.items()}

    try:
        # Validate with Pydantic (catches corrupted data)
        validated_metadata = AIMetadataResponse.model_validate(ai_metadata_data)
        logger.info(
            "Returning validated AI metadata",
            extra={
                "proposal_id": str(proposal_id),
                "confidence": validated_metadata.confidence_level,
                "proven_cases_count": len(validated_metadata.proven_cases),
                "model": validated_metadata.usage_stats.model_used,
            },
        )
        return validated_metadata
    except Exception as e:
        logger.error(
            "Failed to validate AI metadata: %s",
            e,
            extra={"proposal_id": str(proposal_id)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI metadata validation failed: {e!s}",
        ) from e
