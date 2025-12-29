"""
PDF processing orchestrator service.
Coordinates the pipeline: download -> render -> qr -> insert -> upload
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import UUID

from pdf_svc.dto.pdf_request import PdfProcessDTO, QrConfig, QrPdfConfig
from pdf_svc.models.job import Job, JobResult, JobStage, JobStatus
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.pdf_replace_service import PdfReplaceService
from pdf_svc.services.qr_service import QrService
from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


@dataclass
class PdfOrchestrator:
    """
    Orchestrates the PDF processing pipeline.

    Pipeline stages:
    1. Download template from file-svc
    2. Render PDF with placeholder replacements
    3. Generate QR code
    4. Insert QR into PDF
    5. Upload final PDF to file-svc
    """

    temp_dir: Path
    qr_service: QrService = field(default_factory=QrService)
    pdf_replace_service: PdfReplaceService = field(default_factory=PdfReplaceService)
    pdf_qr_insert_service: PdfQrInsertService = field(default_factory=PdfQrInsertService)

    def __post_init__(self) -> None:
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def _get_temp_path(self, job_id: UUID, suffix: str) -> Path:
        """Get temp file path for job."""
        return self.temp_dir / f"{job_id}_{suffix}"

    def _calculate_hash(self, data: bytes) -> str:
        """Calculate SHA256 hash of data."""
        return hashlib.sha256(data).hexdigest()

    async def render_pdf(self, job: Job, template_bytes: bytes) -> bytes:
        """
        Stage: Render PDF with placeholder replacements.

        Args:
            job: Job instance with pdf_items
            template_bytes: Template PDF bytes

        Returns:
            Rendered PDF bytes
        """
        job.update_status(JobStatus.RENDERING, JobStage.RENDER)
        logger.info("rendering_pdf", job_id=str(job.id), items=len(job.pdf_items))

        rendered = await self.pdf_replace_service.render_pdf_bytes_async(
            template_pdf=template_bytes,
            pdf_items=job.pdf_items,
        )

        job.update_status(JobStatus.RENDERED, JobStage.RENDER)
        logger.info("pdf_rendered", job_id=str(job.id), size=len(rendered))
        return rendered

    async def generate_qr(self, job: Job, qr_config: QrConfig) -> bytes:
        """
        Stage: Generate QR code.

        Args:
            job: Job instance
            qr_config: QR configuration

        Returns:
            QR code PNG bytes
        """
        job.update_status(JobStatus.GENERATING_QR, JobStage.QR)
        logger.info(
            "generating_qr",
            job_id=str(job.id),
            base_url=qr_config.base_url,
            verify_code=qr_config.verify_code,
        )

        qr_png = await self.qr_service.generate_png_async(
            base_url=qr_config.base_url,
            verify_code=qr_config.verify_code,
        )

        job.update_status(JobStatus.QR_GENERATED, JobStage.QR)
        logger.info("qr_generated", job_id=str(job.id), size=len(qr_png))
        return qr_png

    async def insert_qr(
        self, job: Job, pdf_bytes: bytes, qr_png: bytes, qr_pdf_config: QrPdfConfig
    ) -> bytes:
        """
        Stage: Insert QR code into PDF.

        Args:
            job: Job instance
            pdf_bytes: PDF bytes to modify
            qr_png: QR code PNG bytes
            qr_pdf_config: QR insertion configuration

        Returns:
            Final PDF bytes with QR inserted
        """
        job.update_status(JobStatus.INSERTING_QR, JobStage.INSERT)
        logger.info(
            "inserting_qr",
            job_id=str(job.id),
            page=qr_pdf_config.qr_page,
            rect=qr_pdf_config.qr_rect,
        )

        final_pdf = await self.pdf_qr_insert_service.insert_qr_bytes_async(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=qr_pdf_config.qr_page,
            qr_rect=qr_pdf_config.qr_rect,
            qr_size_cm=qr_pdf_config.qr_size_cm,
            qr_margin_y_cm=qr_pdf_config.qr_margin_y_cm,
            qr_margin_x_cm=qr_pdf_config.qr_margin_x_cm,
        )

        job.update_status(JobStatus.QR_INSERTED, JobStage.INSERT)
        logger.info("qr_inserted", job_id=str(job.id), size=len(final_pdf))
        return final_pdf

    async def process_local(
        self,
        job: Job,
        template_bytes: bytes,
        qr_config: QrConfig,
        qr_pdf_config: QrPdfConfig,
    ) -> tuple[bytes, str]:
        """
        Process PDF locally (without file-svc events).

        Useful for testing or when template is already available.

        Args:
            job: Job instance
            template_bytes: Template PDF bytes
            qr_config: QR configuration
            qr_pdf_config: QR insertion configuration

        Returns:
            Tuple of (final PDF bytes, file hash)
        """
        # Stage 1: Render PDF
        rendered_pdf = await self.render_pdf(job, template_bytes)

        # Stage 2: Generate QR
        qr_png = await self.generate_qr(job, qr_config)

        # Stage 3: Insert QR
        final_pdf = await self.insert_qr(job, rendered_pdf, qr_png, qr_pdf_config)

        # Calculate hash
        file_hash = self._calculate_hash(final_pdf)

        # Save to temp file
        output_path = self._get_temp_path(job.id, f"{job.serial_code}.pdf")
        output_path.write_bytes(final_pdf)
        job.output_path = str(output_path)

        logger.info(
            "local_processing_complete",
            job_id=str(job.id),
            output_path=str(output_path),
            size=len(final_pdf),
            hash=file_hash[:16],
        )

        return final_pdf, file_hash

    def create_job_result(
        self,
        job: Job,
        file_id: UUID,
        file_name: str,
        file_size: int,
        file_hash: Optional[str] = None,
        download_url: Optional[str] = None,
    ) -> JobResult:
        """Create job result after successful upload."""
        result = JobResult(
            file_id=file_id,
            file_name=file_name,
            file_hash=file_hash,
            file_size_bytes=file_size,
            download_url=download_url,
            created_at=datetime.now(timezone.utc),
        )
        job.set_result(result)
        return result

    def cleanup_temp_files(self, job: Job) -> None:
        """Clean up temporary files for a job."""
        paths = [job.template_path, job.output_path, job.qr_path]
        for path_str in paths:
            if path_str:
                path = Path(path_str)
                if path.exists():
                    try:
                        path.unlink()
                        logger.debug("temp_file_removed", path=path_str)
                    except Exception as e:
                        logger.warning("temp_file_removal_failed", path=path_str, error=str(e))
