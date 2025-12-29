"""
pdf-svc - Event-driven PDF generation microservice.

Entry point for the service.
"""

from __future__ import annotations

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import nats
import structlog
from redis.asyncio import Redis

from pdf_svc.config.settings import get_settings
from pdf_svc.events.publishers import PdfEventPublisher
from pdf_svc.events.subscribers import PdfEventHandler
from pdf_svc.repositories.file_repository import FileRepository
from pdf_svc.repositories.job_repository import RedisJobRepository
from pdf_svc.services.pdf_orchestrator import PdfOrchestrator
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.pdf_replace_service import PdfReplaceService
from pdf_svc.services.qr_service import QrService
from pdf_svc.shared.logger import setup_logging

logger = structlog.get_logger()


class PdfService:
    """Main PDF service application."""

    def __init__(self) -> None:
        """Initialize service."""
        self.settings = get_settings()
        self._running = False
        self._shutdown_event = asyncio.Event()

        # Connections
        self._redis: Redis | None = None
        self._nats: nats.aio.client.Client | None = None

        # Components
        self._job_repository: RedisJobRepository | None = None
        self._file_repository: FileRepository | None = None
        self._orchestrator: PdfOrchestrator | None = None
        self._publisher: PdfEventPublisher | None = None
        self._handler: PdfEventHandler | None = None

    async def start(self) -> None:
        """Start the service."""
        log = logger.bind(component="pdf_service")
        log.info("starting_service", environment=self.settings.environment)

        # Setup logging
        setup_logging(self.settings)

        # Ensure temp directory exists
        Path(self.settings.temp_dir).mkdir(parents=True, exist_ok=True)

        # Connect to Redis
        self._redis = Redis(
            host=self.settings.redis.host,
            port=self.settings.redis.port,
            db=self.settings.redis.db,
            password=self.settings.redis.password or None,
            decode_responses=False,
        )
        await self._redis.ping()
        log.info("redis_connected", host=self.settings.redis.host, port=self.settings.redis.port)

        # Connect to NATS
        self._nats = await nats.connect(self.settings.nats.url)
        log.info("nats_connected", url=self.settings.nats.url)

        # Initialize repositories
        self._job_repository = RedisJobRepository(
            redis_client=self._redis,
            settings=self.settings,
        )

        self._file_repository = FileRepository(
            nats_client=self._nats,
            settings=self.settings,
        )
        await self._file_repository.start()

        # Initialize services
        qr_service = QrService(
            logo_url=self.settings.qr.logo_url,
            logo_path=self.settings.qr.logo_path,
            logo_cache_path=self.settings.qr.logo_cache_path,
        )
        pdf_replace_service = PdfReplaceService()
        pdf_qr_insert_service = PdfQrInsertService()

        self._orchestrator = PdfOrchestrator(
            qr_service=qr_service,
            pdf_replace_service=pdf_replace_service,
            pdf_qr_insert_service=pdf_qr_insert_service,
            file_repository=self._file_repository,
            job_repository=self._job_repository,
            temp_dir=self.settings.temp_dir,
        )

        # Initialize event publisher and handler
        self._publisher = PdfEventPublisher(
            nats_client=self._nats,
            settings=self.settings,
        )

        self._handler = PdfEventHandler(
            nats_client=self._nats,
            settings=self.settings,
            job_repository=self._job_repository,
            orchestrator=self._orchestrator,
            publisher=self._publisher,
        )
        await self._handler.start()

        self._running = True
        log.info("service_started", process_subject=self.settings.pdf_svc.process_subject)

    async def stop(self) -> None:
        """Stop the service."""
        log = logger.bind(component="pdf_service")
        log.info("stopping_service")

        self._running = False

        # Stop event handler
        if self._handler:
            await self._handler.stop()

        # Stop file repository
        if self._file_repository:
            await self._file_repository.stop()

        # Close NATS
        if self._nats and self._nats.is_connected:
            await self._nats.close()
            log.info("nats_disconnected")

        # Close Redis
        if self._redis:
            await self._redis.close()
            log.info("redis_disconnected")

        log.info("service_stopped")

    async def run(self) -> None:
        """Run the service until shutdown."""
        await self.start()

        # Setup signal handlers
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(
                sig,
                lambda s=sig: asyncio.create_task(self._handle_signal(s)),
            )

        logger.info("service_running", message="Press Ctrl+C to stop")

        # Wait for shutdown
        await self._shutdown_event.wait()
        await self.stop()

    async def _handle_signal(self, sig: signal.Signals) -> None:
        """Handle shutdown signal."""
        logger.info("shutdown_signal_received", signal=sig.name)
        self._shutdown_event.set()


def main() -> None:
    """Main entry point."""
    service = PdfService()

    try:
        asyncio.run(service.run())
    except KeyboardInterrupt:
        logger.info("keyboard_interrupt")
    except Exception as e:
        logger.error("service_error", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
