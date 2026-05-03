"""
File-related schemas for uploads and downloads.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FileUploadResponse(BaseModel):
    """Response after successful file upload."""

    id: UUID
    filename: str
    file_size: int = Field(description="File size in bytes")
    file_type: str = Field(description="File extension without dot")
    category: str
    processing_status: str = Field(description="queued, processing, completed, failed")
    uploaded_at: datetime
    is_deduplicated: bool = False
    cached_from_date: datetime | None = None
    message: str = "File uploaded successfully"

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "filename": "water_analysis.pdf",
                "file_size": 2048576,
                "file_type": "pdf",
                "category": "analysis",
                "processing_status": "queued",
                "uploaded_at": "2025-09-30T18:00:00Z",
                "is_deduplicated": False,
                "cached_from_date": None,
                "message": "File uploaded successfully",
            }
        },
    )


class FileInfo(BaseModel):
    """Basic file information for list views."""

    id: UUID
    filename: str
    file_size: int
    file_type: str
    category: str
    uploaded_at: datetime
    processed_text: bool = Field(description="Whether text has been extracted")
    ai_analysis: bool = Field(description="Whether AI analysis is available")
    processing_status: str = Field(
        description="Processing state: queued, processing, completed, failed"
    )


class FileListResponse(BaseModel):
    """List of files for a project."""

    project_id: UUID
    files: list[FileInfo]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "files": [
                    {
                        "id": "file-uuid-1",
                        "filename": "analysis.pdf",
                        "file_size": 2048576,
                        "file_type": "pdf",
                        "category": "analysis",
                        "uploaded_at": "2025-09-30T18:00:00Z",
                        "processed_text": True,
                        "ai_analysis": True,
                        "processing_status": "completed",
                    }
                ],
                "total": 1,
            }
        },
    )


class FileDetailResponse(BaseModel):
    """Detailed file information including processed content."""

    id: UUID
    project_id: UUID
    filename: str
    file_size: int
    file_type: str
    category: str
    uploaded_at: datetime
    processed_text: str | None = Field(None, description="Extracted text content")
    ai_analysis: dict[str, Any] | None = Field(None, description="AI analysis results")

    model_config = ConfigDict(from_attributes=True)
