"""
NATS Event Publishers for pdf-svc.
"""

from __future__ import annotations

from uuid import UUID

import structlog
from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import Settings
from pdf_svc.models.events import (
    PdfBatchCompleted,
    PdfBatchFailed,
    PdfBatchFailedPayload,
    PdfBatchResultPayload,
    PdfItemCompleted,
    PdfItemCompletedPayload,
    PdfItemFailed,
    PdfItemFailedPayload,
    PdfItemResult,
    PdfItemResultData,
    PdfItemResultError,
)
from pdf_svc.models.job import BatchJob, ItemData, ItemError, ItemStatus

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
        log = logger.bind(pdf_job_id=str(job.pdf_job_id), job_id=str(job.job_id))

        # Build item results
        items = []
        for item in job.items:
            if item.status == ItemStatus.COMPLETED and item.data:
                items.append(
                    PdfItemResult(
                        item_id=item.item_id,
                        user_id=item.user_id,
                        serial_code=item.serial_code,
                        status="completed",
                        data=PdfItemResultData(
                            file_id=item.data.file_id,
                            file_name=item.data.file_name,
                            file_size=item.data.file_size,
                            file_hash=item.data.file_hash,
                            mime_type=item.data.mime_type or "application/pdf",
                            is_public=item.data.is_public,
                            download_url=item.data.download_url,
                            created_at=item.data.created_at,
                            processing_time_ms=item.data.processing_time_ms,
                        ),
                        error=None,
                    )
                )
            elif item.status == ItemStatus.FAILED and item.error:
                items.append(
                    PdfItemResult(
                        item_id=item.item_id,
                        user_id=item.user_id,
                        serial_code=item.serial_code,
                        status="failed",
                        data=None,
                        error=PdfItemResultError(
                            user_id=item.user_id,
                            status="failed",
                            message=item.error.message,
                            stage=item.error.stage,
                            code=item.error.code,
                        ),
                    )
                )

        event = PdfBatchCompleted(
            payload=PdfBatchResultPayload(
                pdf_job_id=job.pdf_job_id,
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
            status=job.status.value,
            success_count=job.success_count,
            failed_count=job.failed_count,
        )

    async def publish_batch_failed(
        self,
        pdf_job_id: UUID | None,
        job_id: UUID | None,
        message: str,
        code: str | None = None,
    ) -> None:
        """
        Publish batch processing failed event (entire batch failed).

        Args:
            pdf_job_id: External job UUID (from caller)
            job_id: Internal job UUID (if created)
            message: Error message
            code: Optional error code
        """
        log = logger.bind(pdf_job_id=str(pdf_job_id) if pdf_job_id else None)

        event = PdfBatchFailed(
            payload=PdfBatchFailedPayload(
                pdf_job_id=pdf_job_id,
                job_id=job_id,
                status="failed",
                message=message,
                code=code,
            )
        )

        await self.nats.publish(
            self.settings.pdf_svc.failed_subject,
            event.model_dump_json().encode(),
        )

        log.error(
            "batch_failed_published",
            subject=self.settings.pdf_svc.failed_subject,
            message=message,
            code=code,
        )

    async def publish_item_completed(
        self,
        pdf_job_id: UUID,
        job_id: UUID,
        item_id: UUID,
        user_id: UUID,
        serial_code: str,
        data: ItemData,
    ) -> None:
        """
        Publish individual item completed event (for real-time tracking).

        Args:
            pdf_job_id: External job UUID
            job_id: Internal job UUID
            item_id: Item UUID
            user_id: User UUID
            serial_code: Item serial code
            data: Item result data
        """
        event = PdfItemCompleted(
            payload=PdfItemCompletedPayload(
                pdf_job_id=pdf_job_id,
                job_id=job_id,
                item_id=item_id,
                user_id=user_id,
                serial_code=serial_code,
                status="completed",
                data=PdfItemResultData(
                    file_id=data.file_id,
                    file_name=data.file_name,
                    file_size=data.file_size,
                    file_hash=data.file_hash,
                    mime_type=data.mime_type or "application/pdf",
                    is_public=data.is_public,
                    download_url=data.download_url,
                    created_at=data.created_at,
                    processing_time_ms=data.processing_time_ms,
                ),
            )
        )

        await self.nats.publish(
            self.settings.pdf_svc.item_completed_subject,
            event.model_dump_json().encode(),
        )

        logger.debug(
            "item_completed_published",
            pdf_job_id=str(pdf_job_id),
            job_id=str(job_id),
            item_id=str(item_id),
            user_id=str(user_id),
            serial_code=serial_code,
        )

    async def publish_item_failed(
        self,
        pdf_job_id: UUID,
        job_id: UUID,
        item_id: UUID,
        user_id: UUID,
        serial_code: str,
        error: ItemError,
    ) -> None:
        """
        Publish individual item failed event.

        Args:
            pdf_job_id: External job UUID
            job_id: Internal job UUID
            item_id: Item UUID
            user_id: User UUID
            serial_code: Item serial code
            error: Error information
        """
        event = PdfItemFailed(
            payload=PdfItemFailedPayload(
                pdf_job_id=pdf_job_id,
                job_id=job_id,
                item_id=item_id,
                user_id=user_id,
                serial_code=serial_code,
                status="failed",
                message=error.message,
                stage=error.stage,
                code=error.code,
            )
        )

        await self.nats.publish(
            self.settings.pdf_svc.item_failed_subject,
            event.model_dump_json().encode(),
        )

        logger.debug(
            "item_failed_published",
            pdf_job_id=str(pdf_job_id),
            job_id=str(job_id),
            item_id=str(item_id),
            user_id=str(user_id),
            serial_code=serial_code,
            message=error.message,
        )
