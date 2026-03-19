"""
File upload and management endpoints.
"""

import asyncio
import tempfile
from pathlib import Path
from typing import IO
from uuid import UUID

import aiofiles
import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    ActiveProjectDep,
    AsyncDB,
    CurrentUser,
    OrganizationContext,
    ProjectDep,
    require_not_archived,
)
from app.authz import permissions
from app.authz.authz import (
    Ownership,
    raise_org_access_denied,
    raise_resource_not_found,
    require_permission,
)
from app.core.config import settings
from app.core.database import get_async_db
from app.models.file import ProjectFile
from app.models.project import Project
from app.models.timeline import TimelineEvent
from app.schemas.common import ErrorResponse
from app.schemas.file import FileDetailResponse, FileListResponse, FileUploadResponse
from app.services.intake_ingestion_service import IntakeIngestionService
from app.services.s3_service import USE_S3, get_presigned_url, upload_file_to_s3
from app.services.storage_delete_service import (
    StorageDeleteError,
    delete_storage_keys,
    validate_storage_keys,
)

logger = structlog.get_logger(__name__)

router = APIRouter()

# Import limiter for rate limiting
from typing import Annotated

from app.main import limiter

# Allowed file extensions and max size (single source of truth via settings)
ALLOWED_EXTENSIONS = {
    (ext if ext.startswith(".") else f".{ext}").lower() for ext in settings.allowed_extensions_list
}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE
EXTENSION_TO_MIME: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
}
STREAM_CHUNK_SIZE = 1024 * 1024


def validate_mime_type(file_ext: str, content_type: str | None) -> None:
    if not content_type or content_type == "application/octet-stream":
        return
    expected = EXTENSION_TO_MIME.get(file_ext)
    if expected and content_type not in expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content-Type mismatch: {content_type} vs {file_ext}",
        )


def validate_file(upload_file: UploadFile) -> None:
    """Basic validation for uploaded files.

    Ensures the file has a name and an allowed extension.
    Raises HTTPException with 400 status on invalid files.
    """
    filename = upload_file.filename or ""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_ext or 'unknown'}",
        )
    validate_mime_type(file_ext, upload_file.content_type)


async def stream_file_to_path_and_hash(
    upload_file: UploadFile, destination: Path
) -> tuple[int, str]:
    import hashlib

    size = 0
    hasher = hashlib.sha256()
    async with aiofiles.open(destination, "wb") as out:
        while True:
            chunk = await upload_file.read(STREAM_CHUNK_SIZE)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024} MB",
                )
            hasher.update(chunk)
            await out.write(chunk)
    return size, hasher.hexdigest()


def safe_unlink(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        return


def open_binary(path: Path) -> IO[bytes]:
    return path.open("rb")


@router.post(
    "/{project_id}/files",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Upload file",
    description="Upload a file to a project. Supports PDF, DOCX, XLSX, JPG, PNG formats",
)
@limiter.limit("10/minute")  # File upload - conservative (resource intensive)
async def upload_file(
    request: Request,
    project: ActiveProjectDep,
    current_user: CurrentUser,
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_async_db)],
    category: Annotated[str, Form()] = "general",
    process_with_ai: Annotated[bool, Form()] = False,
):
    """
    Upload a file to a project.

    **Supported file types:**
    - Documents: PDF, DOCX, TXT
    - Spreadsheets: XLSX, XLS
    - Images: JPG, JPEG, PNG

    **Categories:**
    - `general` - General project files
    - `analysis` - Water quality analysis
    - `technical` - Technical specifications
    - `regulatory` - Regulatory documents
    - `photos` - Site photos

    **Processing:**
    - If `process_with_ai=true`, queues ingestion for PDFs, docx, xlsx, csv, txt, and images
    - Other types are stored only

    **Storage:**
    - Local: `./storage/projects/{project_id}/`
    - S3: `projects/{project_id}/files/`

    **Example:**
    ```bash
    curl -X POST /api/v1/projects/{id}/files \
      -H "Authorization: Bearer {token}" \
      -F "file=@analysis.pdf" \
      -F "category=analysis" \
      -F "process_with_ai=true"
    ```
    """
    require_permission(
        current_user,
        permissions.FILE_UPLOAD,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    # Validate file
    validate_file(file)

    try:
        # Generate unique filename
        import uuid

        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must include a filename",
            )
        file_ext = Path(file.filename).suffix.lower()

        # AI processing is supported for document evidence + images
        is_image = file_ext in {".jpg", ".jpeg", ".png"}
        is_document = file_ext in {".pdf", ".docx", ".xlsx", ".csv", ".txt"}
        if process_with_ai and not (is_image or is_document):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AI processing is only supported for document or image files",
            )

        unique_filename = f"{uuid.uuid4()}{file_ext}"

        file_size = 0
        file_hash = ""

        # Store file
        if USE_S3:
            s3_key = f"projects/{project.id}/files/{unique_filename}"
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                tmp_path = Path(tmp_file.name)
            try:
                file_size, file_hash = await stream_file_to_path_and_hash(file, tmp_path)
                file_buffer = await asyncio.to_thread(open_binary, tmp_path)
                try:
                    await upload_file_to_s3(file_buffer, s3_key, file.content_type)
                finally:
                    file_buffer.close()
            finally:
                safe_unlink(tmp_path)
            file_path = s3_key
        else:
            storage_key = f"projects/{project.id}/files/{unique_filename}"
            storage_path = Path(settings.LOCAL_STORAGE_PATH) / storage_key
            storage_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                file_size, file_hash = await stream_file_to_path_and_hash(file, storage_path)
            except Exception:
                safe_unlink(storage_path)
                raise
            file_path = storage_key

        is_deduplicated = False
        cached_from_date = None
        if file_hash:
            cached_result = await db.execute(
                select(ProjectFile)
                .where(
                    ProjectFile.file_hash == file_hash,
                    ProjectFile.project_id == project.id,
                    ProjectFile.organization_id == project.organization_id,
                    ProjectFile.processing_status == "completed",
                )
                .limit(1)
            )
            cached = cached_result.scalar_one_or_none()
            if cached and (cached.ai_analysis or cached.processed_text):
                is_deduplicated = True
                cached_from_date = cached.processed_at

        # Re-check archive state with lock before DB mutation
        locked_result = await db.execute(
            select(Project)
            .where(
                Project.id == project.id,
                Project.organization_id == project.organization_id,
            )
            .with_for_update()
        )
        locked_project = locked_result.scalar_one_or_none()
        if not locked_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
        try:
            require_not_archived(locked_project)
        except HTTPException:
            try:
                await delete_storage_keys([file_path])
            except StorageDeleteError as exc:
                logger.warning("uploaded_file_cleanup_failed", path=file_path, error=str(exc))
            raise

        # Determine processing defaults
        from datetime import UTC, datetime

        should_process = process_with_ai and (is_image or is_document)
        initial_status = "queued" if should_process else "completed"
        processed_at = None if should_process else datetime.now(UTC)

        # Create database record
        project_file = ProjectFile(
            project_id=project.id,
            organization_id=project.organization_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_ext.lstrip("."),
            mime_type=file.content_type or "application/octet-stream",
            category=category,
            uploaded_by=current_user.id,
            file_hash=file_hash,
            processing_status=initial_status,
            processing_attempts=0,
            processed_at=processed_at,
        )

        db.add(project_file)
        await db.flush()  # Get the ID

        # Queue ingestion if requested and supported
        if should_process:
            ingestion_service = IntakeIngestionService()
            await ingestion_service.enqueue_ingestion(db, project_file)
            processing_status = "queued"
        else:
            processing_status = "completed"

        # Create timeline event
        event = TimelineEvent(
            project_id=project.id,
            organization_id=project.organization_id,
            event_type="file_uploaded",
            title="File uploaded",
            description=f"Uploaded file: {file.filename}",
            actor=f"user_{current_user.id}",
            event_metadata={
                "file_id": str(project_file.id),
                "filename": file.filename,
                "file_size": file_size,
                "category": category,
                "user_id": str(current_user.id),
            },
        )
        db.add(event)
        await db.commit()
        await db.refresh(project_file)

        logger.info("File uploaded", filename=file.filename, project_id=str(project.id))

        return FileUploadResponse(
            id=project_file.id,
            filename=project_file.filename,
            file_size=file_size,
            file_type=project_file.file_type or file_ext.lstrip("."),
            category=category,
            processing_status=processing_status,
            uploaded_at=project_file.created_at,
            is_deduplicated=is_deduplicated,
            cached_from_date=cached_from_date,
            message="File uploaded successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {e!s}",
        ) from e


@router.get(
    "/{project_id}/files",
    response_model=FileListResponse,
    responses={404: {"model": ErrorResponse}},
    summary="List project files",
)
async def list_files(
    project: ProjectDep,
    db: AsyncDB,
):
    """List all files for a project (newest first)."""
    result = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project.id)
        .order_by(ProjectFile.created_at.desc())
    )
    files = result.scalars().all()

    file_list = []
    for f in files:
        has_text = f.processed_text is not None
        has_ai = f.ai_analysis is not None
        processing_status = f.processing_status
        inferred_file_type = f.file_type or Path(f.filename or "").suffix.lower().lstrip(".")
        file_list.append(
            {
                "id": f.id,
                "filename": f.filename,
                "file_size": f.file_size or 0,
                "file_type": inferred_file_type,
                "category": f.category,
                "uploaded_at": f.created_at,
                "processed_text": has_text,
                "ai_analysis": has_ai,
                "processing_status": processing_status,
            }
        )

    return FileListResponse(
        project_id=project.id,
        files=file_list,
        total=len(file_list),
    )


@router.get(
    "/{project_id}/files/{file_id}",
    response_model=FileDetailResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get file details",
)
async def get_file_detail(
    project: ProjectDep,
    file_id: UUID,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Get detailed information about a file.

    Includes:
    - File metadata
    - Processing status
    - Extracted text (if processed)
    - AI analysis (if available)
    """
    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project.id,
            ProjectFile.organization_id == project.organization_id,
        )
    )
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    return FileDetailResponse(
        id=file.id,
        project_id=file.project_id,
        filename=file.filename,
        file_size=file.file_size or 0,
        file_type=file.file_type or Path(file.filename or "").suffix.lower().lstrip("."),
        category=file.category,
        uploaded_at=file.created_at,
        processed_text=file.processed_text,
        ai_analysis=file.ai_analysis,
    )


@router.get(
    "/files/{file_id}/download",
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Download file",
)
async def download_file(
    file_id: UUID,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Get a download URL for a file.

    Always returns JSON with a URL:
    - **S3**: Presigned URL (24h expiry)
    - **Local**: URL to static file server

    Frontend should fetch the blob from the returned URL.
    """
    from app.services.s3_service import StorageError

    result = await db.execute(
        select(ProjectFile, Project.user_id)
        .join(Project, Project.id == ProjectFile.project_id)
        .where(
            ProjectFile.id == file_id,
            Project.organization_id == org.id,
        )
    )
    row = result.first()
    if row is None:
        cross_tenant_probe = await db.get(ProjectFile, file_id)
        if cross_tenant_probe is not None:
            raise_org_access_denied(org_id=str(org.id))
        raise_resource_not_found("File not found", details={"file_id": str(file_id)})
    assert row is not None
    file, owner_user_id = row
    require_permission(
        current_user,
        permissions.FILE_READ,
        ownership=Ownership.OWN,
        owner_user_id=owner_user_id,
    )

    # Fail fast: let StorageError propagate with proper error code
    try:
        url = await get_presigned_url(file.file_path, expires=86400)
    except StorageError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e

    return {"url": url, "filename": file.filename, "mime_type": file.mime_type}


@router.delete(
    "/{project_id}/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
    summary="Delete file",
)
async def delete_file(
    project: ActiveProjectDep,
    file_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Delete a file from a project.

    Deletes both the database record and the physical file.
    """
    require_permission(
        current_user,
        permissions.FILE_DELETE,
        ownership=Ownership.OWN,
        owner_user_id=project.user_id,
    )
    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project.id,
            ProjectFile.organization_id == project.organization_id,
        )
    )
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Re-check archive state with lock before DB mutation
    locked_result = await db.execute(
        select(Project)
        .where(
            Project.id == project.id,
            Project.organization_id == project.organization_id,
        )
        .with_for_update()
    )
    locked_project = locked_result.scalar_one_or_none()
    if not locked_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    require_not_archived(locked_project)

    file_path = file.file_path
    filename = file.filename
    try:
        validate_storage_keys([file_path])
    except StorageDeleteError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Delete database record
    await db.delete(file)

    # Create timeline event
    event = TimelineEvent(
        project_id=project.id,
        organization_id=project.organization_id,
        event_type="file_deleted",
        title="File deleted",
        description=f"Deleted file: {file.filename}",
        actor=f"user_{current_user.id}",
        event_metadata={
            "filename": file.filename,
            "user_id": str(current_user.id),
        },
    )
    db.add(event)
    await db.commit()

    # Delete physical file after DB commit (best effort)
    try:
        await delete_storage_keys([file_path])
    except Exception as exc:
        logger.warning("file_storage_delete_failed", path=file_path, error=str(exc))

    logger.info("File deleted", filename=filename, project_id=str(project.id))

    return None
