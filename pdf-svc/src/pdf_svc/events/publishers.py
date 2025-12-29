"""
NATS Event Publishers for pdf-svc.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

import structlog
from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import Settings
from pdf_svc.models.events import (
    PdfBatchCompleted,
    PdfBatchFailed,
    PdfBatchResultPayload,
    PdfItemCompleted,
    PdfItemCompletedPayload,
    PdfItemFailed,
    PdfItemFailedPayload,
    PdfItemResult,
)
from pdf_svc.models.job import BatchJob

if TYPE_CHECKING:
    pass

logger = structlog.get_logger()


class PdfEventPublisher:
    """Publisher for pdf-svc events."""

    def __init__(
        self,
        nats_client: NatsClient,
        settings: Settings,
    ) -> None:
        """
        Initialize event publisher.

        Args:
            nats_client: Connected NATS client
            settings: Application settings
        """
        self.nats = nats_client
        self.settings = settings

    async def publish_batch_completed(self, job: BatchJob) -> None:
        """
        Publish batch processing completed event.

        Args:
            job: Completed BatchJob
        """
        log = logger.bind(job_id=str(job.job_id))

        # Build item results
        items = [
            PdfItemResult(
                item_id=item.item_id,
                user_id=item.user_id,
                serial_code=item.serial_code,
                status=item.status.value,
                data=item.data.model_dump(mode="json") if item.data else None,
                error=item.error.model_dump(mode="json") if item.error else None,
            )
            for item in job.items
        ]

        event = PdfBatchCompleted(
            payload=PdfBatchResultPayload(
                job_id=job.job_id,
                status=job.status.value,
                total_items=job.total_items,
                success_count=job.success_count,
                failed_count=job.failed_count,
                items=items,
                processing_time_ms=job.processing_time_ms,
            )
        )

        await self.nats.publish(
            self.settings.pdf_svc.completed_subject,
            event.model_dump_json().encode(),
        )

        log.info(
            "batch_completed_published",
            subject=self.settings.pdf_svc.completed_subject,
            success_count=job.success_count,
            failed_count=job.failed_count,
        )

    async def publish_batch_failed(
        self,
        job_id: UUID,
        error: str,
        code: str | None = None,
    ) -> None:
        """
        Publish batch processing failed event (entire batch failed).

        Args:
            job_id: Job UUID
            error: Error message
            code: Optional error code
        """
        log = logger.bind(job_id=str(job_id))

        event = PdfBatchFailed(
            payload={
                "job_id": str(job_id),
                "error": error,
                "code": code,
            }
        )

        await self.nats.publish(
            self.settings.pdf_svc.failed_subject,
            event.model_dump_json().encode(),
        )

        log.error(
            "batch_failed_published",
            subject=self.settings.pdf_svc.failed_subject,
            error=error,
        )

    async def publish_item_completed(
        self,
        job_id: UUID,
        item_id: UUID,
        user_id: UUID,
        serial_code: str,
        data: dict,
    ) -> None:
        """
        Publish individual item completed event (for real-time tracking).

        Args:
            job_id: Parent job UUID
            item_id: Item UUID
            user_id: User UUID
            serial_code: Item serial code
            data: Item result data
        """
        event = PdfItemCompleted(
            payload=PdfItemCompletedPayload(
                job_id=job_id,
                item_id=item_id,
                user_id=user_id,
                serial_code=serial_code,
                data=data,
            )
        )

        await self.nats.publish(
            self.settings.pdf_svc.item_completed_subject,
            event.model_dump_json().encode(),
        )

        logger.debug(
            "item_completed_published",
            job_id=str(job_id),
            item_id=str(item_id),
            serial_code=serial_code,
        )

    async def publish_item_failed(
        self,
        job_id: UUID,
        item_id: UUID,
        user_id: UUID,
        serial_code: str,
        error: dict,
    ) -> None:
        """
        Publish individual item failed event.

        Args:
            job_id: Parent job UUID
            item_id: Item UUID
            user_id: User UUID
            serial_code: Item serial code
            error: Error information
        """
        event = PdfItemFailed(
            payload=PdfItemFailedPayload(
                job_id=job_id,
                item_id=item_id,
                user_id=user_id,
                serial_code=serial_code,
                error=error,
            )
        )

        await self.nats.publish(
            self.settings.pdf_svc.item_failed_subject,
            event.model_dump_json().encode(),
        )

        logger.debug(
            "item_failed_published",
            job_id=str(job_id),
            item_id=str(item_id),
            serial_code=serial_code,
        )
