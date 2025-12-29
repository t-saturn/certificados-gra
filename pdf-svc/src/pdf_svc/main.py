"""
PDF Service - Event-driven PDF generator.

Main entry point using FastStream for NATS/Redis communication.
"""

from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

from faststream import FastStream
from faststream.nats import NatsBroker
from redis.asyncio import Redis

from pdf_svc.config.settings import Settings, get_settings
from pdf_svc.events.publishers import PdfEventPublisher
from pdf_svc.events.subscribers import PdfEventHandler
from pdf_svc.models.events import (
    FileDownloadCompleted,
    FileDownloadFailed,
    FileUploadCompleted,
    FileUploadFailed,
    PdfJobStatusRequest,
    PdfProcessRequest,
)
from pdf_svc.repositories.file_repository import FileRepository
from pdf_svc.repositories.job_repository import RedisJobRepository
from pdf_svc.services.pdf_orchestrator import PdfOrchestrator
from pdf_svc.services.qr_service import QrService
from pdf_svc.shared.logger import configure_logging, get_logger

logger = get_logger(__name__)

# Global state
_redis: Redis | None = None
_handler: PdfEventHandler | None = None


def create_qr_service(settings: Settings) -> QrService:
    """Create QR service with configuration."""
    return QrService(
        logo_path=settings.qr.logo_path,
        logo_url=settings.qr.logo_url,
        logo_cache_path=settings.qr.logo_cache_path,
    )


def create_orchestrator(settings: Settings, qr_service: QrService) -> PdfOrchestrator:
    """Create PDF orchestrator."""
    return PdfOrchestrator(
        temp_dir=settings.temp_dir,
        qr_service=qr_service,
    )


@asynccontextmanager
async def lifespan(app: FastStream) -> AsyncIterator[None]:
    """Application lifespan - setup and teardown."""
    global _redis, _handler

    settings = get_settings()

    # Configure logging
    configure_logging(
        level=settings.log.level,
        log_format=settings.log.format,
        log_dir=settings.log.dir,
    )

    logger.info(
        "starting_pdf_svc",
        environment=settings.environment,
        nats_url=settings.nats.url,
        redis_url=settings.redis.url,
    )

    # Connect to Redis
    _redis = Redis.from_url(settings.redis.url, decode_responses=False)
    await _redis.ping()
    logger.info("redis_connected")

    # Create repositories
    job_repo = RedisJobRepository(
        redis=_redis,
        prefix=settings.redis.key_prefix,
        ttl_seconds=settings.redis.job_ttl_seconds,
    )

    # Get NATS client from broker
    nats_client = broker._connection

    file_repo = FileRepository(
        nats_client=nats_client,
        download_subject=settings.file_svc.download_subject,
        upload_subject=settings.file_svc.upload_subject,
    )

    # Create services
    qr_service = create_qr_service(settings)
    orchestrator = create_orchestrator(settings, qr_service)

    # Create publisher
    publisher = PdfEventPublisher(
        nats_client=nats_client,
        completed_subject=settings.pdf_svc.completed_subject,
        failed_subject=settings.pdf_svc.failed_subject,
    )

    # Create event handler
    _handler = PdfEventHandler(
        job_repository=job_repo,
        file_repository=file_repo,
        orchestrator=orchestrator,
        publisher=publisher,
    )

    logger.info("pdf_svc_ready")

    yield

    # Cleanup
    if _redis:
        await _redis.close()
        logger.info("redis_disconnected")

    logger.info("pdf_svc_stopped")


# Create broker and app
settings = get_settings()
broker = NatsBroker(settings.nats.url)
app = FastStream(broker, lifespan=lifespan)


# ============================================
# Event Handlers
# ============================================


@broker.subscriber(settings.pdf_svc.process_subject)
async def on_process_request(data: dict[str, Any]) -> None:
    """Handle PDF process request."""
    if _handler is None:
        logger.error("handler_not_initialized")
        return

    try:
        event = PdfProcessRequest.model_validate(data)
        await _handler.handle_process_request(event)
    except Exception as e:
        logger.exception("process_request_error", error=str(e))


@broker.subscriber(settings.file_svc.download_completed)
async def on_download_completed(data: dict[str, Any]) -> None:
    """Handle file download completed."""
    if _handler is None:
        return

    try:
        event = FileDownloadCompleted.model_validate(data)
        await _handler.handle_download_completed(event)
    except Exception as e:
        logger.exception("download_completed_error", error=str(e))


@broker.subscriber("files.download.failed")
async def on_download_failed(data: dict[str, Any]) -> None:
    """Handle file download failed."""
    if _handler is None:
        return

    try:
        event = FileDownloadFailed.model_validate(data)
        await _handler.handle_download_failed(event)
    except Exception as e:
        logger.exception("download_failed_error", error=str(e))


@broker.subscriber(settings.file_svc.upload_completed)
async def on_upload_completed(data: dict[str, Any]) -> None:
    """Handle file upload completed."""
    if _handler is None:
        return

    try:
        event = FileUploadCompleted.model_validate(data)
        await _handler.handle_upload_completed(event)
    except Exception as e:
        logger.exception("upload_completed_error", error=str(e))


@broker.subscriber("files.upload.failed")
async def on_upload_failed(data: dict[str, Any]) -> None:
    """Handle file upload failed."""
    if _handler is None:
        return

    try:
        event = FileUploadFailed.model_validate(data)
        await _handler.handle_upload_failed(event)
    except Exception as e:
        logger.exception("upload_failed_error", error=str(e))


@broker.subscriber("pdf.job.status.requested")
async def on_status_request(data: dict[str, Any]) -> None:
    """Handle job status request."""
    if _handler is None:
        return

    try:
        event = PdfJobStatusRequest.model_validate(data)
        await _handler.handle_status_request(event)
    except Exception as e:
        logger.exception("status_request_error", error=str(e))


def main() -> None:
    """Main entry point."""
    import uvloop

    uvloop.install()
    app.run()


if __name__ == "__main__":
    main()
