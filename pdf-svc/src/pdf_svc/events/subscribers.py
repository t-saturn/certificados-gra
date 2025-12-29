"""
NATS Event Subscribers for pdf-svc.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

import orjson
import structlog
from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import Settings
from pdf_svc.events.publishers import PdfEventPublisher
from pdf_svc.models.events import PdfItemRequest
from pdf_svc.models.job import BatchItem, BatchJob, ItemStatus

if TYPE_CHECKING:
    from pdf_svc.repositories.job_repository import RedisJobRepository
    from pdf_svc.services.pdf_orchestrator import PdfOrchestrator

logger = structlog.get_logger()


class PdfEventHandler:
    """Handler for pdf-svc incoming events."""

    def __init__(
        self,
        nats_client: NatsClient,
        settings: Settings,
        job_repository: "RedisJobRepository",
        orchestrator: "PdfOrchestrator",
        publisher: PdfEventPublisher,
    ) -> None:
        """
        Initialize event handler.

        Args:
            nats_client: Connected NATS client
            settings: Application settings
            job_repository: Job repository
            orchestrator: PDF orchestrator
            publisher: Event publisher
        """
        self.nats = nats_client
        self.settings = settings
        self.job_repository = job_repository
        self.orchestrator = orchestrator
        self.publisher = publisher

        self._process_sub = None
        self._status_sub = None

    async def start(self) -> None:
        """Start listening for events."""
        log = logger.bind(component="pdf_event_handler")

        # Subscribe to batch process requests
        self._process_sub = await self.nats.subscribe(
            self.settings.pdf_svc.process_subject,
            cb=self._handle_batch_request,
        )

        # Subscribe to status requests
        self._status_sub = await self.nats.subscribe(
            "pdf.job.status.requested",
            cb=self._handle_status_request,
        )

        log.info(
            "event_handler_started",
            process_subject=self.settings.pdf_svc.process_subject,
        )

    async def stop(self) -> None:
        """Stop listening for events."""
        if self._process_sub:
            await self._process_sub.unsubscribe()
        if self._status_sub:
            await self._status_sub.unsubscribe()

        logger.info("event_handler_stopped")

    async def _handle_batch_request(self, msg) -> None:
        """Handle incoming batch processing request."""
        log = logger.bind(subject=msg.subject)

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})

            log.info("batch_request_received", item_count=len(payload.get("items", [])))

            # Create batch job
            job = BatchJob(
                project_id=UUID(payload["project_id"]) if payload.get("project_id") else None,
            )

            # Add items to job
            for item_data in payload.get("items", []):
                item_request = PdfItemRequest.model_validate(item_data)

                batch_item = BatchItem(
                    user_id=item_request.user_id,
                    template_id=item_request.template_id,
                    serial_code=item_request.serial_code,
                    is_public=item_request.is_public,
                    pdf_items=item_request.pdf,
                    qr_config=item_request.qr,
                    qr_pdf_config=item_request.qr_pdf,
                )
                job.add_item(batch_item)

            log.info("job_created", job_id=str(job.job_id), total_items=job.total_items)

            # Process the batch
            processed_job = await self.orchestrator.process_batch(job)

            # Publish per-item events
            for item in processed_job.items:
                if item.status == ItemStatus.COMPLETED and item.data:
                    await self.publisher.publish_item_completed(
                        job_id=processed_job.job_id,
                        item_id=item.item_id,
                        user_id=item.user_id,
                        serial_code=item.serial_code,
                        data=item.data.model_dump(mode="json"),
                    )
                elif item.status == ItemStatus.FAILED and item.error:
                    await self.publisher.publish_item_failed(
                        job_id=processed_job.job_id,
                        item_id=item.item_id,
                        user_id=item.user_id,
                        serial_code=item.serial_code,
                        error=item.error.model_dump(mode="json"),
                    )

            # Publish batch completed event
            await self.publisher.publish_batch_completed(processed_job)

        except Exception as e:
            log.error("batch_request_error", error=str(e))

            # Try to publish failure event
            try:
                job_id = UUID(data.get("payload", {}).get("job_id", ""))
            except Exception:
                from uuid import uuid4
                job_id = uuid4()

            await self.publisher.publish_batch_failed(
                job_id=job_id,
                error=str(e),
                code="PROCESSING_ERROR",
            )

    async def _handle_status_request(self, msg) -> None:
        """Handle job status request."""
        log = logger.bind(subject=msg.subject)

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload["job_id"])

            log.debug("status_request_received", job_id=str(job_id))

            job = await self.job_repository.get(job_id)

            if job:
                response = {
                    "event_type": "pdf.job.status.response",
                    "payload": job.to_response(),
                }
            else:
                response = {
                    "event_type": "pdf.job.status.response",
                    "payload": {
                        "job_id": str(job_id),
                        "error": "Job not found",
                    },
                }

            # Reply to the message
            if msg.reply:
                await self.nats.publish(
                    msg.reply,
                    orjson.dumps(response),
                )

        except Exception as e:
            log.error("status_request_error", error=str(e))
