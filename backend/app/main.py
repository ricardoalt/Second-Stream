"""
H2O Allegiant Backend - Main application entry point.
"""

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import anyio
import structlog
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_users.password import PasswordHelper
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.database import AsyncSessionLocal, close_db
from app.models.user import User
from app.schemas.common import APIError, ErrorResponse

# ============================================================================
# Structured Logging Configuration (Best Practice 2025)
# ============================================================================
# structlog provides:
# - JSON output for production (easy parsing)
# - Consistent log format across application
# - Contextual information preserved
# - Integration with observability tools (Datadog, Grafana, CloudWatch)
# ============================================================================

if settings.ENVIRONMENT == "production":
    # Production: JSON output for log aggregation
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),  # JSON output
    ]
else:
    # Development: Human-readable colored output
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(),  # Colored output
    ]

structlog.configure(
    processors=processors,
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Configure standard library logging (for libraries that use it)
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler(),
    ],
)

# Get structured logger for this module
logger = structlog.get_logger(__name__)

# Ensure log directory exists
Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)


# Rate Limiter Configuration (slowapi with Redis backend)
# Redis-backed storage for distributed rate limiting across multiple ECS tasks
# This ensures rate limits work correctly when auto-scaling (>1 task)
def get_redis_url() -> str:
    """Get Redis URL for rate limiter storage."""
    if settings.REDIS_PASSWORD:
        return f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
    return f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"


# Use Redis storage if available, fallback to in-memory for local dev
try:
    limiter = Limiter(
        key_func=get_remote_address, storage_uri=get_redis_url(), strategy="fixed-window"
    )
    logger.info("✅ Rate limiter initialized with Redis backend (distributed)")
except Exception as e:
    # Fallback to in-memory for local development
    logger.warning(f"⚠️ Redis unavailable, using in-memory rate limiting: {e}")
    limiter = Limiter(key_func=get_remote_address)
    logger.info("✅ Rate limiter initialized with in-memory storage (local only)")


async def create_initial_superuser() -> None:
    """Create foundational superuser from env vars if configured and missing.

    This is intended for initial bootstrap only. It is safe to run on every
    startup: if the user already exists, nothing is changed.
    """

    email = settings.FIRST_SUPERUSER_EMAIL
    password = settings.FIRST_SUPERUSER_PASSWORD

    if not email or not password:
        logger.info("Skipping initial superuser creation - FIRST_SUPERUSER_* not set")
        return

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            if user:
                logger.info("Initial superuser already exists", email=email)
                return

            password_helper = PasswordHelper()
            hashed_password = password_helper.hash(password)

            user = User(
                email=email,
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True,
                is_verified=True,
                role="admin",
                organization_id=None,
                first_name="Admin",
                last_name="User",
            )

            session.add(user)
            await session.commit()
            logger.info("Initial superuser created", email=email)

    except SQLAlchemyError as e:
        logger.error("Failed to create initial superuser", error=str(e))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting H2O Allegiant Backend...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Validate configuration before accepting traffic
    from app.core.startup_checks import validate_production_config, validate_required_secrets

    validate_required_secrets()
    validate_production_config()

    # Initialize database (only in development)
    # DISABLED: Use Alembic migrations instead
    # if settings.DEBUG:
    #     logger.warning("Debug mode: initializing database tables...")
    #     await init_db()

    # Initialize Redis cache
    from app.services.cache_service import cache_service

    await cache_service.connect()

    # Create initial superuser (idempotent)
    await create_initial_superuser()

    # Ensure storage directory exists
    if settings.USE_LOCAL_STORAGE:
        await anyio.Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
        logger.info(f"Local storage path: {settings.LOCAL_STORAGE_PATH}")

    logger.info("✅ Application started successfully")

    yield

    # Shutdown
    logger.info("🛑 Shutting down application...")
    await close_db()
    await cache_service.close()
    logger.info("✅ Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered water treatment engineering platform backend",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
    middleware=[
        Middleware(
            CORSMiddleware,  # ty: ignore[invalid-argument-type]
            allow_origins=settings.cors_origins_list,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "X-Organization-Id"],
            expose_headers=["Content-Disposition"],
        )
    ],
    # Note: response_model_by_alias removed - FastAPI Users doesn't use aliases
    # Frontend transforms snake_case to camelCase in auth.ts
    # response_model_by_alias=True,  # ← Removed: causes Content-Length mismatch
)

# Add rate limiter to app state
app.state.limiter = limiter


# Custom RateLimitExceeded handler (replaces slowapi default)
# Ensures all 429 responses use our ErrorResponse format
async def rate_limit_exceeded_handler(request: Request, exc: Exception) -> Response:
    """Handle rate limit exceeded with consistent ErrorResponse format."""
    limit = str(exc.detail) if isinstance(exc, RateLimitExceeded) else "unknown"
    logger.warning(
        "Rate limit exceeded",
        path=request.url.path,
        limit=limit,
    )
    error_response = ErrorResponse(
        error=APIError(
            message="Too many requests. Please try again later.",
            code="RATE_LIMITED",
        )
    )
    return JSONResponse(
        status_code=429,
        content=error_response.model_dump(mode="json"),
        headers={"Retry-After": "60"},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ============================================================================
# Rate Limiting Middleware for FastAPI Users Endpoints
# ============================================================================
# FastAPI Users auto-generates endpoints, so we can't use @limiter.limit()
# decorators. Instead, we use middleware to apply granular limits by path.
# ============================================================================

AUTH_ENDPOINT_LIMITS = {
    # Login/Register - Strict (brute force & spam prevention)
    f"{settings.API_V1_PREFIX}/auth/jwt/login": "5/minute",
    f"{settings.API_V1_PREFIX}/auth/register": "3/minute",
    f"{settings.API_V1_PREFIX}/auth/forgot-password": "3/minute",
    f"{settings.API_V1_PREFIX}/auth/reset-password": "3/minute",
    # Profile access - Generous (frequent legitimate use)
    f"{settings.API_V1_PREFIX}/auth/me": "60/minute",
    # Verification - Moderate
    f"{settings.API_V1_PREFIX}/auth/verify": "10/minute",
    f"{settings.API_V1_PREFIX}/auth/request-verify-token": "5/minute",
}


@app.middleware("http")
async def granular_rate_limit_middleware(request: Request, call_next):
    """
    Apply granular rate limits to auth endpoints using Redis.
    Redis-backed for distributed rate limiting across multiple ECS tasks.
    Custom endpoints use @limiter.limit() decorators instead.
    """
    path = request.url.path
    method = request.method

    # Check if this endpoint has a specific rate limit
    if path in AUTH_ENDPOINT_LIMITS and method in ["GET", "POST", "PATCH", "DELETE"]:
        limit_str = AUTH_ENDPOINT_LIMITS[path]

        try:
            # Parse limit string (e.g., "5/minute")
            count, _period = limit_str.split("/")
            count = int(count)

            # Get client IP
            client_ip = get_remote_address(request)

            # Create cache key for Redis
            cache_key = f"rate_limit:{path}:{client_ip}"

            # Use Redis for distributed rate limiting
            from app.services.cache_service import cache_service

            if cache_service._redis:
                # Increment counter in Redis
                current_count = await cache_service._redis.incr(cache_key)
                current_count_value = int(current_count)

                # Set expiration on first request (60 seconds for "per minute")
                if current_count_value == 1:
                    await cache_service._redis.expire(cache_key, 60)

                # Check if limit exceeded
                if current_count_value > count:
                    logger.warning(
                        f"Rate limit exceeded: {path} from {client_ip} ({current_count_value}/{count})"
                    )
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": {
                                "message": "Too many requests. Please try again later.",
                                "code": "RATE_LIMIT_EXCEEDED",
                            }
                        },
                        headers={"Retry-After": "60"},
                    )
            else:
                # Fallback: If Redis unavailable, allow request (fail open)
                # This prevents blocking users if Redis is down
                logger.warning(f"Redis unavailable for rate limiting, allowing request: {path}")

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Don't block request if rate limiting fails (fail open for availability)

    # Continue with request
    response = await call_next(request)

    # Note: expires_in injection removed - causes Content-Length mismatch
    # Frontend now hardcodes expires_in = 86400 (24h) in auth.ts
    # TODO: Implement custom login endpoint if dynamic expires_in is needed

    return response


# Note: Rate limiting strategy
# - Auth endpoints: Granular limits via middleware (above)
# - Custom endpoints: Use @limiter.limit("X/minute") decorators
# - Read operations: More permissive (e.g., 60/minute)
# - Write operations: More restrictive (e.g., 10/minute)
# - Expensive operations: Very restrictive (e.g., 3/minute)


# Exception Handlers

# Map HTTP status codes to error codes for consistent API responses
HTTP_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "AUTH_REQUIRED",
    403: "FORBIDDEN",
    404: "RESOURCE_NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
}


def _build_error_payload(
    *,
    message: str,
    code: str,
    details: dict | None = None,
    legacy_detail: str | dict | None = None,
) -> dict:
    """
    Backward-compatible error payload.

    Stable contract fields live at top-level: code/message/details.
    Legacy fields remain present during migration to avoid breaking consumers.
    """
    error_response = ErrorResponse(
        error=APIError(
            message=message,
            code=code,
            details=details,
        )
    )
    payload = error_response.model_dump(mode="json")
    payload["code"] = code
    payload["message"] = message
    payload["detail"] = legacy_detail if legacy_detail is not None else message
    if details is not None:
        payload["details"] = details
    return payload


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle all HTTPExceptions with consistent error response format.

    This ensures all 4xx errors are wrapped in our standard ErrorResponse
    schema instead of just returning {"detail": "..."}.

    Preserves exc.headers (e.g., Retry-After for rate limiting).
    """
    # Handle detail that might be a string or a dict
    if isinstance(exc.detail, dict):
        message = exc.detail.get("message", str(exc.detail))
        # Use custom code from detail if provided (e.g., RATE_LIMITED)
        error_code = exc.detail.get("code") or HTTP_ERROR_CODES.get(exc.status_code, "ERROR")
        details = exc.detail.get("details")
        legacy_detail: str | dict | None = {
            "message": message,
            "code": error_code,
            "details": details,
        }
    else:
        message = str(exc.detail)
        error_code = HTTP_ERROR_CODES.get(exc.status_code, "ERROR")
        details = None
        legacy_detail = message

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_payload(
            message=message,
            code=error_code,
            details=details,
            legacy_detail=legacy_detail,
        ),
        headers=exc.headers,  # Preserve headers like Retry-After
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle validation errors with proper error response format."""
    error_id = uuid.uuid4().hex
    logger.error(
        "Validation error",
        exc_info=settings.DEBUG,
        error_id=error_id,
        method=request.method,
        path=request.url.path,
        error_count=len(exc.errors()),
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_build_error_payload(
            message="Validation error",
            code="VALIDATION_ERROR",
            details={"error_id": error_id, "errors": exc.errors()},
        ),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors."""
    error_id = uuid.uuid4().hex
    logger.error(
        "Unexpected error",
        exc_info=settings.DEBUG,
        error_type=type(exc).__name__,
        error_id=error_id,
        method=request.method,
        path=request.url.path,
    )

    details = {"error_id": error_id}
    if settings.DEBUG:
        details["type"] = type(exc).__name__

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_build_error_payload(
            message="Internal server error" if not settings.DEBUG else str(exc),
            code="INTERNAL_ERROR",
            details=details,
        ),
    )


@app.get("/ping", tags=["Health"])
async def ping():
    """Simple ping endpoint for uptime monitoring."""
    return {"status": "ok"}


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": f"{settings.BACKEND_URL}{settings.API_V1_PREFIX}/docs",
        "health_url": f"{settings.BACKEND_URL}/health",
    }


# Import and include routers
from app.api.v1 import (
    admin_proposal_ratings,
    admin_users,
    auth,
    bulk_import,
    companies,
    discovery_sessions,
    feedback,
    files,
    health,
    intake,
    offers,
    organizations,
    project_data,
    projects,
    proposals,
    voice_interviews,
    workspace,
)

# Health checks (available at root and API prefix)
app.include_router(
    health.router,
    tags=["Health"],
)

app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"],
)

app.include_router(
    companies.router,
    prefix=f"{settings.API_V1_PREFIX}/companies",
    tags=["Companies & Locations"],
)

app.include_router(
    projects.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Projects"],
)

app.include_router(
    files.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Files"],
)

app.include_router(
    intake.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Intake"],
)

app.include_router(
    proposals.router,
    prefix=f"{settings.API_V1_PREFIX}/ai/proposals",
    tags=["AI Proposals"],
)

app.include_router(
    project_data.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Project Data"],
)

app.include_router(
    workspace.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Workspace"],
)

app.include_router(
    offers.router,
    prefix=f"{settings.API_V1_PREFIX}/projects",
    tags=["Offers"],
)

app.include_router(
    admin_users.router,
    prefix=f"{settings.API_V1_PREFIX}/admin/users",
    tags=["Admin Users"],
)

app.include_router(
    organizations.router,
    prefix=f"{settings.API_V1_PREFIX}/organizations",
    tags=["Organizations"],
)

app.include_router(
    feedback.router,
    prefix=f"{settings.API_V1_PREFIX}/feedback",
    tags=["Feedback"],
)

app.include_router(
    feedback.admin_router,
    prefix=f"{settings.API_V1_PREFIX}/admin/feedback",
    tags=["Admin Feedback"],
)

app.include_router(
    admin_proposal_ratings.router,
    prefix=f"{settings.API_V1_PREFIX}/admin/proposal-ratings",
    tags=["Admin Proposal Ratings"],
)

app.include_router(
    bulk_import.router,
    prefix=f"{settings.API_V1_PREFIX}/bulk-import",
    tags=["Bulk Import"],
)

app.include_router(
    discovery_sessions.router,
    prefix=f"{settings.API_V1_PREFIX}/discovery-sessions",
    tags=["Discovery Sessions"],
)

app.include_router(
    voice_interviews.router,
    prefix=f"{settings.API_V1_PREFIX}/voice-interviews",
    tags=["Voice Interviews"],
)

# ============================================================================
# Static Files (Development Only)
# ============================================================================
# Serve uploaded files (PDFs, images) in development mode.
# In production, these are served directly from S3.
# ============================================================================
from app.services.s3_service import USE_S3  # re-use same detection as storage service

if not USE_S3:
    storage_dir = Path(settings.LOCAL_STORAGE_PATH).resolve()
    storage_dir.mkdir(exist_ok=True, parents=True)
    app.mount("/uploads", StaticFiles(directory=str(storage_dir)), name="uploads")
    logger.info(f"Local storage path (mounted at /uploads): {storage_dir}")

logger.info("✅ All API routes registered")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
