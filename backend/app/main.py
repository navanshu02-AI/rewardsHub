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


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(request_id)s - %(message)s",
)
logging.getLogger().addFilter(RequestIdFilter())
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
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
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
    )
    try:
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-Id"] = request_id
        logger.info(
            "request completed status_code=%s latency_ms=%.2f",
            response.status_code,
            duration_ms,
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
