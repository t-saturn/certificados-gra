"""
Event publishers for NATS.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import get_settings
from pdf_svc.models.events import (
    PdfJobStatusPayload,
    PdfJobStatusResponse,
    PdfProcessCompleted,
    PdfProcessCompletedPayload,
    PdfProcessFailed,
    PdfProcessFailedPayload,
)
from pdf_svc.models.job import Job
from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


class PdfEventPublisher:
    """
    Publisher for PDF service events.
    """

    def __init__(
        self,
        nats_client: NatsClient,
        completed_subject: str = "pdf.process.completed",
        failed_subject: str = "pdf.process.failed",
        status_subject: str = "pdf.job.status.response",
    ):
        self._nats = nats_client
        self._completed_subject = completed_subject
        self._failed_subject = failed_subject
        self._status_subject = status_subject

    async def publish_completed(
        self,
        job: Job,
        file_id: UUID,
        file_name: str,
        file_size: int,
        file_hash: Optional[str] = None,
        download_url: Optional[str] = None,
        processing_time_ms: int = 0,
    ) -> None:
        """
        Publish PDF processing completed event.

        Args:
            job: Completed job
            file_id: Uploaded file ID
            file_name: File name
            file_size: File size in bytes
            file_hash: File hash
            download_url: Download URL
            processing_time_ms: Processing time in milliseconds
        """
        event = PdfProcessCompleted(
            payload=PdfProcessCompletedPayload(
                pdf_job_id=job.id,
                file_id=file_id,
                file_name=file_name,
                file_hash=file_hash,
                file_size_bytes=file_size,
                download_url=download_url,
                created_at=datetime.now(timezone.utc),
                processing_time_ms=processing_time_ms,
            )
        )

        data = event.model_dump_json().encode()
        await self._nats.publish(self._completed_subject, data)

        logger.info(
            "event_published",
            event_type="pdf.process.completed",
            job_id=str(job.id),
            file_id=str(file_id),
        )

    async def publish_failed(
        self,
        job: Job,
        stage: str,
        error: str,
        error_code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Publish PDF processing failed event.

        Args:
            job: Failed job
            stage: Stage where failure occurred
            error: Error message
            error_code: Error code
            details: Additional error details
        """
        event = PdfProcessFailed(
            payload=PdfProcessFailedPayload(
                pdf_job_id=job.id,
                stage=stage,
                error=error,
                error_code=error_code,
                details=details,
            )
        )

        data = event.model_dump_json().encode()
        await self._nats.publish(self._failed_subject, data)

        logger.info(
            "event_published",
            event_type="pdf.process.failed",
            job_id=str(job.id),
            stage=stage,
            error=error,
        )

    async def publish_status(self, job: Job) -> None:
        """
        Publish job status response.

        Args:
            job: Job to report status for
        """
        result_payload = None
        error_payload = None

        if job.result:
            result_payload = PdfProcessCompletedPayload(
                pdf_job_id=job.id,
                file_id=job.result.file_id,
                file_name=job.result.file_name,
                file_hash=job.result.file_hash,
                file_size_bytes=job.result.file_size_bytes,
                download_url=job.result.download_url,
                created_at=job.result.created_at,
                processing_time_ms=int((job.duration_seconds or 0) * 1000),
            )

        if job.error:
            error_payload = PdfProcessFailedPayload(
                pdf_job_id=job.id,
                stage=job.error.stage.value,
                error=job.error.message,
                details=job.error.details,
            )

        event = PdfJobStatusResponse(
            payload=PdfJobStatusPayload(
                pdf_job_id=job.id,
                status=job.status.value,
                stage=job.stage.value if job.stage else None,
                progress_pct=job.progress_pct,
                created_at=job.created_at,
                updated_at=job.updated_at,
                completed_at=job.completed_at,
                result=result_payload,
                error=error_payload,
            )
        )

        data = event.model_dump_json().encode()
        await self._nats.publish(self._status_subject, data)

        logger.debug(
            "status_published",
            job_id=str(job.id),
            status=job.status.value,
            progress=job.progress_pct,
        )


def create_pdf_publisher(nats_client: NatsClient) -> PdfEventPublisher:
    """Factory function to create PDF event publisher."""
    settings = get_settings()
    return PdfEventPublisher(
        nats_client=nats_client,
        completed_subject=settings.pdf_svc.completed_subject,
        failed_subject=settings.pdf_svc.failed_subject,
    )
