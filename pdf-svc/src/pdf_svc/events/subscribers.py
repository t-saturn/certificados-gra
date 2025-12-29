"""
Event subscribers/handlers for NATS.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

from pdf_svc.config.settings import get_settings
from pdf_svc.dto.pdf_request import PdfProcessDTO, QrConfig, QrPdfConfig
from pdf_svc.models.events import (
    FileDownloadCompleted,
    FileDownloadFailed,
    FileUploadCompleted,
    FileUploadFailed,
    PdfJobStatusRequest,
    PdfProcessRequest,
)
from pdf_svc.models.job import Job, JobStage, JobStatus
from pdf_svc.shared.logger import get_logger

if TYPE_CHECKING:
    from pdf_svc.events.publishers import PdfEventPublisher
    from pdf_svc.repositories.file_repository import FileRepository
    from pdf_svc.repositories.job_repository import RedisJobRepository
    from pdf_svc.services.pdf_orchestrator import PdfOrchestrator

logger = get_logger(__name__)


class PdfEventHandler:
    """
    Handler for PDF service events.

    Coordinates between events, repositories, and services.
    """

    def __init__(
        self,
        job_repository: "RedisJobRepository",
        file_repository: "FileRepository",
        orchestrator: "PdfOrchestrator",
        publisher: "PdfEventPublisher",
    ):
        self._job_repo = job_repository
        self._file_repo = file_repository
        self._orchestrator = orchestrator
        self._publisher = publisher
        self._settings = get_settings()

    async def handle_process_request(self, event: PdfProcessRequest) -> None:
        """
        Handle PDF process request event.

        Pipeline:
        1. Create job
        2. Request template download
        3. Wait for download
        4. Process PDF (render, QR, insert)
        5. Request upload
        6. Wait for upload
        7. Publish result
        """
        payload = event.payload
        logger.info(
            "process_request_received",
            template=str(payload.template),
            serial_code=payload.serial_code,
        )

        # Create job
        job = Job(
            template_id=payload.template,
            user_id=payload.user_id,
            serial_code=payload.serial_code,
            is_public=payload.is_public,
            pdf_items=payload.pdf,
            qr_config={k: v for d in payload.qr for k, v in d.items()},
            qr_pdf_config={k: v for d in payload.qr_pdf for k, v in d.items()},
        )

        await self._job_repo.save(job)
        logger.info("job_created", job_id=str(job.id))

        try:
            # Stage 1: Download template
            job.update_status(JobStatus.DOWNLOADING, JobStage.DOWNLOAD)
            await self._job_repo.save(job)

            template_path = self._settings.temp_dir / f"{job.id}_template.pdf"
            download_result = await self._file_repo.download_and_wait(
                job_id=job.id,
                file_id=payload.template,
                destination_path=template_path,
            )

            job.template_path = str(template_path)
            job.update_status(JobStatus.DOWNLOADED, JobStage.DOWNLOAD)
            await self._job_repo.save(job)

            # Read template
            template_bytes = template_path.read_bytes()

            # Parse configs
            qr_config = QrConfig.from_list(payload.qr)
            qr_pdf_config = QrPdfConfig.from_list(payload.qr_pdf)

            # Stages 2-4: Process PDF locally
            final_pdf, file_hash = await self._orchestrator.process_local(
                job=job,
                template_bytes=template_bytes,
                qr_config=qr_config,
                qr_pdf_config=qr_pdf_config,
            )
            await self._job_repo.save(job)

            # Stage 5: Upload final PDF
            job.update_status(JobStatus.UPLOADING, JobStage.UPLOAD)
            await self._job_repo.save(job)

            output_path = Path(job.output_path)
            file_name = f"{job.serial_code}.pdf"

            upload_result = await self._file_repo.upload_and_wait(
                job_id=job.id,
                user_id=job.user_id,
                file_path=output_path,
                file_name=file_name,
                is_public=job.is_public,
            )

            # Create result
            processing_time = int((job.duration_seconds or 0) * 1000)
            self._orchestrator.create_job_result(
                job=job,
                file_id=upload_result.file_id,
                file_name=upload_result.file_name,
                file_size=upload_result.file_size,
                file_hash=upload_result.file_hash,
                download_url=upload_result.download_url,
            )
            await self._job_repo.save(job)

            # Publish success
            await self._publisher.publish_completed(
                job=job,
                file_id=upload_result.file_id,
                file_name=upload_result.file_name,
                file_size=upload_result.file_size,
                file_hash=upload_result.file_hash,
                download_url=upload_result.download_url,
                processing_time_ms=processing_time,
            )

            logger.info(
                "process_completed",
                job_id=str(job.id),
                file_id=str(upload_result.file_id),
                processing_time_ms=processing_time,
            )

        except Exception as e:
            stage = job.stage or JobStage.DOWNLOAD
            job.set_error(stage, str(e))
            await self._job_repo.save(job)

            await self._publisher.publish_failed(
                job=job,
                stage=stage.value,
                error=str(e),
            )

            logger.error(
                "process_failed",
                job_id=str(job.id),
                stage=stage.value,
                error=str(e),
            )

        finally:
            # Cleanup temp files
            self._orchestrator.cleanup_temp_files(job)

    async def handle_download_completed(self, event: FileDownloadCompleted) -> None:
        """Handle file download completed event from file-svc."""
        job_id = event.payload.job_id
        logger.debug("download_completed", job_id=str(job_id))
        self._file_repo.resolve_download(job_id, event)

    async def handle_download_failed(self, event: FileDownloadFailed) -> None:
        """Handle file download failed event from file-svc."""
        job_id = event.payload.job_id
        logger.warning("download_failed", job_id=str(job_id), error=event.payload.error)
        self._file_repo.resolve_download(job_id, event)

    async def handle_upload_completed(self, event: FileUploadCompleted) -> None:
        """Handle file upload completed event from file-svc."""
        job_id = event.payload.job_id
        logger.debug("upload_completed", job_id=str(job_id), file_id=str(event.payload.file_id))
        self._file_repo.resolve_upload(job_id, event)

    async def handle_upload_failed(self, event: FileUploadFailed) -> None:
        """Handle file upload failed event from file-svc."""
        job_id = event.payload.job_id
        logger.warning("upload_failed", job_id=str(job_id), error=event.payload.error)
        self._file_repo.resolve_upload(job_id, event)

    async def handle_status_request(self, event: PdfJobStatusRequest) -> None:
        """Handle job status request."""
        job_id = event.payload.get("pdf_job_id")
        if not job_id:
            logger.warning("status_request_missing_job_id")
            return

        job = await self._job_repo.get(UUID(str(job_id)))
        if not job:
            logger.warning("status_request_job_not_found", job_id=str(job_id))
            return

        await self._publisher.publish_status(job)
        logger.debug("status_response_sent", job_id=str(job_id))
