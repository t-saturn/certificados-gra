"""
NATS Event Subscribers for pdf-svc.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

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
        pdf_job_id: UUID | None = None

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})

            # Get pdf_job_id from request (required)
            pdf_job_id = UUID(payload["pdf_job_id"])

            log.info(
                "batch_request_received",
                pdf_job_id=str(pdf_job_id),
                item_count=len(payload.get("items", [])),
            )

            # Create batch job
            job = BatchJob(pdf_job_id=pdf_job_id)

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

            log.info(
                "job_created",
                pdf_job_id=str(job.pdf_job_id),
                job_id=str(job.job_id),
                total_items=job.total_items,
            )

            # Process the batch
            processed_job = await self.orchestrator.process_batch(job)

            # Publish per-item events
            for item in processed_job.items:
                if item.status == ItemStatus.COMPLETED and item.data:
                    await self.publisher.publish_item_completed(
                        pdf_job_id=processed_job.pdf_job_id,
                        job_id=processed_job.job_id,
                        item_id=item.item_id,
                        user_id=item.user_id,
                        serial_code=item.serial_code,
                        data=item.data,
                    )
                elif item.status == ItemStatus.FAILED and item.error:
                    await self.publisher.publish_item_failed(
                        pdf_job_id=processed_job.pdf_job_id,
                        job_id=processed_job.job_id,
                        item_id=item.item_id,
                        user_id=item.user_id,
                        serial_code=item.serial_code,
                        error=item.error,
                    )

            # Publish batch completed event
            await self.publisher.publish_batch_completed(processed_job)

        except KeyError as e:
            log.error("batch_request_missing_field", error=str(e))
            await self.publisher.publish_batch_failed(
                pdf_job_id=pdf_job_id,
                job_id=None,
                message=f"Missing required field: {e}",
                code="VALIDATION_ERROR",
            )

        except Exception as e:
            log.error("batch_request_error", error=str(e))
            await self.publisher.publish_batch_failed(
                pdf_job_id=pdf_job_id,
                job_id=None,
                message=str(e),
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
                        "status": "not_found",
                        "message": "Job not found",
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
