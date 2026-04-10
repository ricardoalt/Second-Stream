#!/usr/bin/env python3
"""
Cleanup orphaned storage objects.

- Collects all file paths referenced by ProjectFile and Proposal rows
- Removes local files or S3 objects not referenced in the database

Designed for scheduled maintenance (cron/one-off).
"""

import asyncio
import sys
from pathlib import Path

import anyio

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import aioboto3
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.feedback_attachment import FeedbackAttachment
from app.models.file import ProjectFile
from app.models.proposal import Proposal
from app.services.s3_service import LOCAL_UPLOADS_DIR, USE_S3
from app.utils.purge_utils import extract_pdf_paths

_ALLOWED_PREFIXES = ("projects/", "proposals/", "feedback/")


def _resolve_project_file_path(path_str: str, storage_root: Path) -> Path:
    path_obj = Path(path_str)
    if path_obj.is_absolute():
        return path_obj.resolve()
    return (storage_root / path_obj).resolve()


def _resolve_pdf_path(path_str: str) -> Path:
    path_obj = Path(path_str)
    if path_obj.is_absolute():
        return path_obj.resolve()
    return (LOCAL_UPLOADS_DIR / path_obj).resolve()


async def _collect_referenced_paths() -> tuple[set[str], set[Path]]:
    referenced_keys: set[str] = set()
    referenced_paths: set[Path] = set()
    storage_root = await anyio.Path(settings.LOCAL_STORAGE_PATH).resolve()

    async with AsyncSessionLocal() as db:
        file_rows = await db.execute(select(ProjectFile.file_path))
        for row in file_rows:
            file_path = row.file_path
            if not file_path:
                continue
            referenced_keys.add(file_path)
            referenced_paths.add(_resolve_project_file_path(file_path, storage_root))

        proposal_rows = await db.execute(select(Proposal.pdf_path, Proposal.ai_metadata))
        for pdf_path, ai_metadata in proposal_rows:
            if pdf_path:
                referenced_keys.add(pdf_path)
                referenced_paths.add(_resolve_pdf_path(pdf_path))
            for extra_path in extract_pdf_paths(ai_metadata):
                referenced_keys.add(extra_path)
                referenced_paths.add(_resolve_pdf_path(extra_path))

        attachment_rows = await db.execute(select(FeedbackAttachment.storage_key))
        for row in attachment_rows:
            storage_key = row.storage_key
            if not storage_key:
                continue
            referenced_keys.add(storage_key)
            referenced_paths.add((storage_root / storage_key).resolve())

    return referenced_keys, referenced_paths


async def _cleanup_local(referenced_paths: set[Path]) -> None:
    storage_root = await anyio.Path(settings.LOCAL_STORAGE_PATH).resolve()
    targets = [
        storage_root / "projects",
        storage_root / "feedback",
        await anyio.Path(LOCAL_UPLOADS_DIR).resolve(),
    ]

    deleted = 0
    for target in targets:
        if not await target.exists():
            continue
        async for file_path in target.rglob("*"):
            if not await file_path.is_file():
                continue
            if file_path not in referenced_paths:
                await file_path.unlink()
                deleted += 1

    print(f"🧹 Local cleanup complete. Deleted {deleted} orphaned files.")


async def _cleanup_s3(referenced_keys: set[str]) -> None:
    session = aioboto3.Session()
    client_args = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        client_args["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        client_args["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    deleted = 0
    async with session.client("s3", **client_args) as s3:
        paginator = s3.get_paginator("list_objects_v2")
        async for page in paginator.paginate(Bucket=settings.AWS_S3_BUCKET):
            for item in page.get("Contents", []):
                key = item.get("Key")
                if not key:
                    continue
                if not key.startswith(_ALLOWED_PREFIXES):
                    continue
                if key in referenced_keys:
                    continue
                await s3.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
                deleted += 1

    print(f"🧹 S3 cleanup complete. Deleted {deleted} orphaned objects.")


async def cleanup_orphaned_storage() -> None:
    referenced_keys, referenced_paths = await _collect_referenced_paths()

    if USE_S3:
        await _cleanup_s3(referenced_keys)
    else:
        await _cleanup_local(referenced_paths)


if __name__ == "__main__":
    print("🔄 Starting orphaned storage cleanup...\n")
    asyncio.run(cleanup_orphaned_storage())
