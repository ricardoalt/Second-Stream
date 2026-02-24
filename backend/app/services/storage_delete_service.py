"""Safe deletion helpers for storage keys and local paths."""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path, PurePosixPath

import structlog

from app.core.config import settings
from app.services.s3_service import LOCAL_UPLOADS_DIR, USE_S3, delete_file_from_s3

logger = structlog.get_logger(__name__)

_ALLOWED_PREFIXES = (
    "projects/",
    "proposals/",
    "feedback/",
    "imports/",
    "voice-interviews/",
)


class StorageDeleteError(ValueError):
    """Raised when a storage key/path is unsafe or invalid for deletion."""


def _is_within_root(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def normalize_storage_key(key: str) -> str:
    """
    Validate a storage key for S3 deletion.

    Requirements:
    - Non-empty
    - Relative posix path
    - No path traversal
    - Allowed prefix only
    """
    trimmed = key.strip()
    if not trimmed:
        raise StorageDeleteError("Storage key is empty")

    posix_path = PurePosixPath(trimmed)
    if posix_path.is_absolute():
        raise StorageDeleteError("Storage key must be relative")
    if any(part == ".." for part in posix_path.parts):
        raise StorageDeleteError("Storage key contains path traversal")
    if not trimmed.startswith(_ALLOWED_PREFIXES):
        raise StorageDeleteError("Storage key prefix is not allowed")

    return trimmed


def resolve_local_path(key: str) -> Path:
    """
    Resolve a local filesystem path for deletion, ensuring it stays within allowed roots.

    Accepts:
    - Relative keys with allowed prefixes (projects/, proposals/, feedback/, imports/)
    - Absolute paths under LOCAL_STORAGE_PATH or LOCAL_UPLOADS_DIR

    Absolute paths are supported only for legacy/internal cleanup; new writes should
    always store relative keys.
    """
    trimmed = key.strip()
    if not trimmed:
        raise StorageDeleteError("Storage key is empty")

    storage_root = Path(settings.LOCAL_STORAGE_PATH).resolve()
    uploads_root = LOCAL_UPLOADS_DIR.resolve()

    path_obj = Path(trimmed)
    if path_obj.is_absolute():
        resolved = path_obj.resolve()
        if _is_within_root(resolved, storage_root):
            rel_path = resolved.relative_to(storage_root)
            if not rel_path.as_posix().startswith(_ALLOWED_PREFIXES):
                raise StorageDeleteError("Absolute path prefix is not allowed")
            return resolved
        if _is_within_root(resolved, uploads_root):
            rel_path = resolved.relative_to(uploads_root)
            if not rel_path.as_posix().startswith(_ALLOWED_PREFIXES):
                raise StorageDeleteError("Absolute path prefix is not allowed")
            return resolved
        raise StorageDeleteError("Absolute path outside allowed storage roots")

    normalized = normalize_storage_key(trimmed)
    if normalized.startswith("projects/"):
        resolved = (storage_root / normalized).resolve()
        if not _is_within_root(resolved, storage_root):
            raise StorageDeleteError("Resolved path escaped storage root")
        return resolved

    resolved = (uploads_root / normalized).resolve()
    if not _is_within_root(resolved, uploads_root):
        raise StorageDeleteError("Resolved path escaped uploads root")
    return resolved


async def delete_storage_keys(keys: Iterable[str], use_s3: bool = USE_S3) -> None:
    """
    Delete storage objects safely using allowlisted keys and path checks.

    Raises StorageDeleteError for any unsafe key/path.
    """
    key_list = [key for key in keys if key]
    if not key_list:
        return

    if use_s3:
        valid_keys = [normalize_storage_key(key) for key in key_list]
        for key in valid_keys:
            await delete_file_from_s3(key)
        return

    resolved_paths = [resolve_local_path(key) for key in key_list]
    for path in resolved_paths:
        if path.exists():
            try:
                path.unlink()
            except Exception as exc:
                logger.warning("local_storage_delete_failed", path=str(path), error=str(exc))
                raise StorageDeleteError(f"Failed to delete local storage path: {path}") from exc


def validate_storage_keys(keys: Iterable[str], use_s3: bool = USE_S3) -> None:
    key_list = [key for key in keys if key]
    if not key_list:
        return

    if use_s3:
        for key in key_list:
            normalize_storage_key(key)
        return

    for key in key_list:
        resolve_local_path(key)
