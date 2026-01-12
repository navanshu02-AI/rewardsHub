from __future__ import annotations

import contextvars
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.database.connection import close_mongo_connection, connect_to_mongo

request_id_context: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id",
    default="-",
)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_context.get()
        return True


class SafeRequestFormatter(logging.Formatter):
    """Formatter that guarantees `request_id` exists on the record to avoid
    KeyError during formatting (useful for logs emitted before middleware runs
    or from subprocesses where the filter might not be attached).
    """
    def format(self, record: logging.LogRecord) -> str:
        if not hasattr(record, "request_id"):
            try:
                record.request_id = request_id_context.get()
            except Exception:
                record.request_id = "-"
        return super().format(record)


# Configure logging with a safe formatter that injects `request_id` when missing
logging.basicConfig(level=logging.INFO)
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
fmt = "%(asctime)s - %(name)s - %(levelname)s - %(request_id)s - %(message)s"
safe_formatter = SafeRequestFormatter(fmt)

# Replace formatters on existing handlers so formatting won't raise when
# `request_id` is absent on a LogRecord.
for h in root_logger.handlers:
    h.setFormatter(safe_formatter)

root_logger.addFilter(RequestIdFilter())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("Disconnected from MongoDB")


# Create FastAPI app
openapi_tags = [
    {"name": "authentication", "description": "Account registration, login, and password resets."},
    {"name": "users", "description": "User profiles and directory operations."},
    {"name": "rewards", "description": "Reward catalog and redemption options."},
    {"name": "recommendations", "description": "Reward recommendations and suggestions."},
    {"name": "preferences", "description": "User preference management."},
    {"name": "recognitions", "description": "Peer recognition and kudos."},
    {"name": "points", "description": "Points balance and transaction history."},
    {"name": "admin-redemptions", "description": "Admin workflows for redemption approvals."},
    {"name": "admin-analytics", "description": "Admin reporting and analytics endpoints."},
    {"name": "orgs", "description": "Organization configuration and metadata."},
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_tags=openapi_tags,
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    token = request_id_context.set(request_id)
    start_time = time.perf_counter()
    logger.info(
        "request started method=%s path=%s",
        request.method,
        request.url.path,
        extra={"request_id": request_id},
    )
    try:
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-Id"] = request_id
        logger.info(
            "request completed status_code=%s latency_ms=%.2f",
            response.status_code,
            duration_ms,
            extra={"request_id": request_id},
        )
        return response
    finally:
        request_id_context.reset(token)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": "Rewards & Recognition API", "version": settings.VERSION}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
