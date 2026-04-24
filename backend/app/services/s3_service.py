import re
import unicodedata
from io import BytesIO
from pathlib import Path, PurePosixPath
from typing import IO, Literal

import aioboto3
import aiofiles
import structlog

from app.core.config import settings


# Custom exception for storage errors (fail fast)
class StorageError(Exception):
    """Raised when storage operations fail."""

    pass


# S3 configuration from centralized settings (Single Source of Truth)
S3_BUCKET = settings.AWS_S3_BUCKET
S3_REGION = settings.AWS_REGION
S3_ACCESS_KEY = settings.AWS_ACCESS_KEY_ID
S3_SECRET_KEY = settings.AWS_SECRET_ACCESS_KEY

# Local storage configuration for development
# Canonical local layout (no extra "/uploads" layer):
# - projects/... and proposals/... live directly under LOCAL_STORAGE_PATH
LOCAL_UPLOADS_DIR = Path(settings.LOCAL_STORAGE_PATH)
LOCAL_UPLOADS_DIR.mkdir(exist_ok=True, parents=True)

# Explicit S3 validation: bucket must be non-empty string (not just "not None")
USE_S3 = bool(S3_BUCKET and S3_BUCKET.strip())

logger = structlog.get_logger(__name__)
_ALLOWED_LOCAL_PREFIXES = (
    "chat/",
    "projects/",
    "proposals/",
    "feedback/",
    "imports/",
    "voice-interviews/",
)
ATTACHMENT_PRESIGNED_TTL_SECONDS = 600
_MAX_HEADER_FILENAME_LENGTH = 150


def _ascii_safe_filename(filename: str, fallback: str = "attachment") -> str:
    if not filename:
        filename = fallback

    safe_name = Path(filename).name
    normalized = unicodedata.normalize("NFKD", safe_name)
    ascii_name = normalized.encode("ascii", "ignore").decode()
    ascii_name = ascii_name.replace("\x00", "")
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_name).strip("._-")

    if not ascii_name:
        ascii_name = fallback

    if len(ascii_name) > _MAX_HEADER_FILENAME_LENGTH:
        ascii_name = ascii_name[:_MAX_HEADER_FILENAME_LENGTH]

    return ascii_name


def _is_within_root(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def _normalize_relative_key(key: str) -> str:
    trimmed = key.strip()
    if not trimmed:
        raise StorageError("Storage key is empty")

    posix_path = PurePosixPath(trimmed)
    if posix_path.is_absolute():
        raise StorageError("Storage key must be relative")
    if any(part == ".." for part in posix_path.parts):
        raise StorageError("Storage key contains path traversal")
    if not trimmed.startswith(_ALLOWED_LOCAL_PREFIXES):
        raise StorageError("Storage key prefix is not allowed")
    return trimmed


def _resolve_local_file(filename: str) -> tuple[Path, Path]:
    storage_root = Path(settings.LOCAL_STORAGE_PATH).resolve()
    uploads_root = LOCAL_UPLOADS_DIR.resolve()
    path_obj = Path(filename)

    if path_obj.is_absolute():
        resolved = path_obj.resolve()
        if _is_within_root(resolved, storage_root):
            rel_path = resolved.relative_to(storage_root)
            if not rel_path.as_posix().startswith(_ALLOWED_LOCAL_PREFIXES):
                raise StorageError("Local file path prefix is not allowed")
            return resolved, rel_path
        raise StorageError("Local file path outside storage roots")

    normalized = _normalize_relative_key(filename)
    rel_path = Path(normalized)

    storage_path = (storage_root / rel_path).resolve()
    if _is_within_root(storage_path, storage_root) and storage_path.exists():
        return storage_path, rel_path

    uploads_path = (uploads_root / rel_path).resolve()
    if _is_within_root(uploads_path, uploads_root) and uploads_path.exists():
        return uploads_path, rel_path

    return storage_path, rel_path


async def upload_file_to_s3(
    file_obj: IO[bytes] | BytesIO, filename: str, content_type: str | None = None
) -> str:
    """Upload a file to S3 or save locally in development."""
    try:
        if USE_S3:  # Production mode: use S3
            logger.info(f"Uploading file to S3: {filename}")
            session = aioboto3.Session()
            extra_args = {"ContentType": content_type} if content_type else {}

            if S3_ACCESS_KEY and S3_SECRET_KEY:
                logger.warning(
                    "Using explicit S3 credentials. This is not recommended in AWS production."
                )
                async with session.client(
                    "s3",
                    region_name=S3_REGION,
                    aws_access_key_id=S3_ACCESS_KEY,
                    aws_secret_access_key=S3_SECRET_KEY,
                ) as s3:
                    await s3.upload_fileobj(file_obj, S3_BUCKET, filename, ExtraArgs=extra_args)
            else:
                async with session.client("s3", region_name=S3_REGION) as s3:
                    await s3.upload_fileobj(file_obj, S3_BUCKET, filename, ExtraArgs=extra_args)
        else:  # Development mode: save locally
            logger.info(f"Saving file locally (dev mode): {filename}")
            normalized = _normalize_relative_key(filename)
            local_path = LOCAL_UPLOADS_DIR / normalized
            # Ensure directory exists
            local_path.parent.mkdir(parents=True, exist_ok=True)

            # Save file locally
            file_obj.seek(0)
            content = file_obj.read()
            async with aiofiles.open(local_path, "wb") as f:
                await f.write(content)

        return filename
    except Exception as e:
        logger.error(f"Error uploading file: {e!s}")
        raise


async def get_presigned_url(filename: str, expires: int = 3600) -> str:
    """Generate a presigned URL for S3 or a local URL in development.

    Raises:
        StorageError: If URL generation fails (fail fast principle)
    """
    if USE_S3:
        # Production mode: S3 URL
        try:
            normalized = _normalize_relative_key(filename)
            session = aioboto3.Session()
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                async with session.client(
                    "s3",
                    region_name=S3_REGION,
                    aws_access_key_id=S3_ACCESS_KEY,
                    aws_secret_access_key=S3_SECRET_KEY,
                ) as s3:
                    url = await s3.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": S3_BUCKET, "Key": normalized},
                        ExpiresIn=expires,
                    )
            else:
                async with session.client("s3", region_name=S3_REGION) as s3:
                    url = await s3.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": S3_BUCKET, "Key": normalized},
                        ExpiresIn=expires,
                    )
            return url
        except Exception as e:
            logger.error("S3 presigned URL generation failed", error=str(e), key=filename)
            raise StorageError(f"Failed to generate S3 URL: {e}") from e

    # Development/local mode: build static URL
    try:
        full_path, rel_path = _resolve_local_file(filename)
    except StorageError as e:
        raise StorageError(f"Invalid local storage key: {filename}") from e

    if not full_path.exists():
        raise StorageError(f"Local file not found: {full_path}")

    return f"{settings.BACKEND_URL}/uploads/{rel_path.as_posix()}"


async def get_presigned_url_with_headers(
    filename: str,
    *,
    disposition: Literal["attachment", "inline"] = "attachment",
    download_name: str | None = None,
    content_type: str | None = None,
    expires: int = ATTACHMENT_PRESIGNED_TTL_SECONDS,
) -> str:
    """Generate presigned GET URL with response headers (S3) or local URL (dev)."""
    if not USE_S3:
        return await get_presigned_url(filename, expires=expires)

    normalized = _normalize_relative_key(filename)
    response_filename = _ascii_safe_filename(download_name or filename)
    response_disposition = f'{disposition}; filename="{response_filename}"'

    params: dict[str, object] = {
        "Bucket": S3_BUCKET,
        "Key": normalized,
        "ResponseContentDisposition": response_disposition,
    }
    if content_type:
        params["ResponseContentType"] = content_type

    try:
        session = aioboto3.Session()
        if S3_ACCESS_KEY and S3_SECRET_KEY:
            async with session.client(
                "s3",
                region_name=S3_REGION,
                aws_access_key_id=S3_ACCESS_KEY,
                aws_secret_access_key=S3_SECRET_KEY,
            ) as s3:
                return await s3.generate_presigned_url(
                    "get_object",
                    Params=params,
                    ExpiresIn=expires,
                )

        async with session.client("s3", region_name=S3_REGION) as s3:
            return await s3.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=expires,
            )
    except Exception as e:
        logger.error("S3 presigned URL generation failed", error=str(e), key=filename)
        raise StorageError(f"Failed to generate S3 URL: {e}") from e


async def download_file_content(filename: str) -> bytes:
    """Download file content from S3 or local as bytes."""
    try:
        if USE_S3:  # Production mode: download from S3
            logger.info(f"Downloading file from S3: {filename}")
            session = aioboto3.Session()

            if S3_ACCESS_KEY and S3_SECRET_KEY:
                async with session.client(
                    "s3",
                    region_name=S3_REGION,
                    aws_access_key_id=S3_ACCESS_KEY,
                    aws_secret_access_key=S3_SECRET_KEY,
                ) as s3:
                    response = await s3.get_object(Bucket=S3_BUCKET, Key=filename)
                    content = await response["Body"].read()
                    logger.info(f"✅ File downloaded from S3: {len(content)} bytes")
                    return content

            async with session.client("s3", region_name=S3_REGION) as s3:
                response = await s3.get_object(Bucket=S3_BUCKET, Key=filename)
                content = await response["Body"].read()
                logger.info(f"✅ File downloaded from S3: {len(content)} bytes")
                return content
        else:  # Local mode: read local file
            local_path, _ = _resolve_local_file(filename)
            logger.info(f"Reading local file: {local_path}")

            if not local_path.exists():
                raise FileNotFoundError(f"Local file not found: {local_path}")

            async with aiofiles.open(local_path, "rb") as f:
                content = await f.read()
                logger.info(f"✅ File read locally: {len(content)} bytes")
                return content

    except Exception as e:
        logger.error(f"Error downloading file {filename}: {e!s}")
        raise


async def delete_file_from_s3(filename: str) -> None:
    """Delete a file from S3 or local storage.

    The operation is idempotent in local mode: deleting a missing file is a
    no-op so callers can safely run compensation cleanup.
    """
    try:
        if not USE_S3:
            local_path, _ = _resolve_local_file(filename)
            local_path.unlink(missing_ok=True)
            return

        normalized = _normalize_relative_key(filename)

        logger.info(f"Deleting file from S3: {normalized}")
        session = aioboto3.Session()
        if S3_ACCESS_KEY and S3_SECRET_KEY:
            logger.warning(
                "Using explicit S3 credentials for delete; avoid this in AWS production."
            )

            async with session.client(
                "s3",
                region_name=S3_REGION,
                aws_access_key_id=S3_ACCESS_KEY,
                aws_secret_access_key=S3_SECRET_KEY,
            ) as s3:
                await s3.delete_object(Bucket=S3_BUCKET, Key=normalized)
            return

        async with session.client("s3", region_name=S3_REGION) as s3:
            await s3.delete_object(Bucket=S3_BUCKET, Key=normalized)
    except Exception as e:
        logger.error(f"Error deleting file {filename} from S3: {e!s}")
        raise
