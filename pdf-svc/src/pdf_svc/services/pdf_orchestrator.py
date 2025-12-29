"""
PDF Orchestrator Service.

Coordinates the full PDF processing pipeline for batch items:
1. Download template from file-svc
2. Render PDF with placeholder replacements
3. Generate QR code
4. Insert QR into PDF
5. Upload result to file-svc
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

import structlog

from pdf_svc.dto.pdf_request import BatchItemRequest, QrConfig, QrPdfConfig
from pdf_svc.models.job import BatchItem, BatchJob, ItemData, ItemStatus
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.pdf_replace_service import PdfReplaceService
from pdf_svc.services.qr_service import QrService

if TYPE_CHECKING:
    from pdf_svc.repositories.file_repository import FileRepository
    from pdf_svc.repositories.job_repository import RedisJobRepository

logger = structlog.get_logger()


class PdfOrchestrator:
    """Orchestrates the full PDF processing pipeline."""

    def __init__(
        self,
        qr_service: QrService,
        pdf_replace_service: PdfReplaceService,
        pdf_qr_insert_service: PdfQrInsertService,
        file_repository: "FileRepository",
        job_repository: "RedisJobRepository",
        temp_dir: str = "./tmp",
    ) -> None:
        """Initialize orchestrator with services."""
        self.qr_service = qr_service
        self.pdf_replace_service = pdf_replace_service
        self.pdf_qr_insert_service = pdf_qr_insert_service
        self.file_repository = file_repository
        self.job_repository = job_repository
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def process_batch(self, job: BatchJob) -> BatchJob:
        """
        Process a batch of PDF items.

        Args:
            job: BatchJob containing items to process

        Returns:
            Updated BatchJob with results
        """
        log = logger.bind(job_id=str(job.job_id), total_items=job.total_items)
        log.info("starting_batch_processing")

        job.start_processing()
        await self.job_repository.save(job)

        # Process each item
        for item in job.items:
            try:
                await self._process_item(job, item)
            except Exception as e:
                log.error("item_processing_error", item_id=str(item.item_id), error=str(e))
                item.set_failed("orchestration", str(e))

            # Save job state after each item
            job.update_counts()
            await self.job_repository.save(job)

        # Finalize job
        job.finalize()
        await self.job_repository.save(job)

        log.info(
            "batch_processing_completed",
            status=job.status.value,
            success_count=job.success_count,
            failed_count=job.failed_count,
            processing_time_ms=job.processing_time_ms,
        )

        return job

    async def _process_item(self, job: BatchJob, item: BatchItem) -> None:
        """
        Process a single item in the batch.

        Args:
            job: Parent batch job
            item: Item to process
        """
        log = logger.bind(
            job_id=str(job.job_id),
            item_id=str(item.item_id),
            serial_code=item.serial_code,
        )
        log.info("processing_item")

        start_time = datetime.now(timezone.utc)
        item_temp_dir = self.temp_dir / str(item.item_id)
        item_temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Paths for this item
            template_path = item_temp_dir / "template.pdf"
            rendered_path = item_temp_dir / "rendered.pdf"
            qr_path = item_temp_dir / "qr.png"
            output_path = item_temp_dir / f"{item.serial_code}.pdf"

            # Step 1: Download template
            item.update_status(ItemStatus.DOWNLOADING, 10)
            template_bytes = await self._download_template(item, template_path)
            item.update_status(ItemStatus.DOWNLOADED, 20)
            log.debug("template_downloaded", size=len(template_bytes))

            # Step 2: Render PDF with placeholders
            item.update_status(ItemStatus.RENDERING, 30)
            rendered_bytes = await self._render_pdf(item, template_bytes)
            item.update_status(ItemStatus.RENDERED, 50)
            log.debug("pdf_rendered", size=len(rendered_bytes))

            # Step 3: Generate QR code
            item.update_status(ItemStatus.GENERATING_QR, 60)
            qr_bytes = await self._generate_qr(item, qr_path)
            item.update_status(ItemStatus.QR_GENERATED, 70)
            log.debug("qr_generated", size=len(qr_bytes))

            # Step 4: Insert QR into PDF
            item.update_status(ItemStatus.INSERTING_QR, 80)
            final_bytes = await self._insert_qr(item, rendered_bytes, qr_bytes)
            item.update_status(ItemStatus.QR_INSERTED, 85)
            log.debug("qr_inserted", size=len(final_bytes))

            # Save final PDF
            output_path.write_bytes(final_bytes)

            # Step 5: Upload result
            item.update_status(ItemStatus.UPLOADING, 90)
            upload_result = await self._upload_result(job, item, output_path)

            # Calculate processing time
            end_time = datetime.now(timezone.utc)
            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)

            # Calculate file hash
            file_hash = hashlib.sha256(final_bytes).hexdigest()

            # Set completed with data
            item_data = ItemData(
                file_id=upload_result.get("file_id"),
                original_name=f"{item.serial_code}.pdf",
                file_name=upload_result.get("file_name", f"{item.serial_code}.pdf"),
                file_size=len(final_bytes),
                file_hash=file_hash,
                mime_type="application/pdf",
                is_public=item.is_public,
                download_url=upload_result.get("download_url"),
                created_at=datetime.now(timezone.utc),
                processing_time_ms=processing_time_ms,
            )
            item.set_completed(item_data)
            log.info("item_completed", processing_time_ms=processing_time_ms)

        except Exception as e:
            log.error("item_failed", error=str(e))
            raise

        finally:
            # Cleanup temp files
            self._cleanup_temp_dir(item_temp_dir)

    async def _download_template(
        self, item: BatchItem, dest_path: Path
    ) -> bytes:
        """Download template PDF from file-svc."""
        log = logger.bind(item_id=str(item.item_id), template_id=str(item.template_id))

        try:
            # Request download from file-svc
            result = await self.file_repository.download_and_wait(
                file_id=item.template_id,
                user_id=item.user_id,
                destination_path=str(dest_path),
            )

            if not result.get("success"):
                raise RuntimeError(f"Download failed: {result.get('error', 'Unknown error')}")

            # Read downloaded file
            if dest_path.exists():
                return dest_path.read_bytes()
            else:
                raise FileNotFoundError(f"Template not found at {dest_path}")

        except Exception as e:
            log.error("download_failed", error=str(e))
            item.set_failed("download", str(e))
            raise

    async def _render_pdf(self, item: BatchItem, template_bytes: bytes) -> bytes:
        """Render PDF with placeholder replacements."""
        try:
            # Get placeholders from item configuration
            placeholders = {}
            for pdf_item in item.pdf_items:
                key = pdf_item.get("key", "").strip()
                value = pdf_item.get("value", "").strip()
                if key:
                    placeholders[f"{{{{{key}}}}}"] = value

            if not placeholders:
                # No replacements needed, return original
                return template_bytes

            result = await self.pdf_replace_service.render_pdf_bytes_async(
                template_pdf=template_bytes,
                pdf_items=item.pdf_items,
            )
            return result

        except Exception as e:
            logger.error("render_failed", item_id=str(item.item_id), error=str(e))
            item.set_failed("render", str(e))
            raise

    async def _generate_qr(self, item: BatchItem, dest_path: Path) -> bytes:
        """Generate QR code PNG."""
        try:
            # Parse QR config
            qr_config = QrConfig.from_list(item.qr_config)

            if not qr_config.base_url or not qr_config.verify_code:
                raise ValueError("QR config requires base_url and verify_code")

            qr_bytes = await self.qr_service.generate_png_async(
                base_url=qr_config.base_url,
                verify_code=qr_config.verify_code,
            )

            # Save to file for reference
            dest_path.write_bytes(qr_bytes)

            return qr_bytes

        except Exception as e:
            logger.error("qr_generation_failed", item_id=str(item.item_id), error=str(e))
            item.set_failed("qr_generation", str(e))
            raise

    async def _insert_qr(
        self, item: BatchItem, pdf_bytes: bytes, qr_bytes: bytes
    ) -> bytes:
        """Insert QR code into PDF."""
        try:
            # Parse QR PDF config
            qr_pdf_config = QrPdfConfig.from_list(item.qr_pdf_config)

            result = await self.pdf_qr_insert_service.insert_qr_bytes_async(
                input_pdf=pdf_bytes,
                qr_png=qr_bytes,
                qr_page=qr_pdf_config.qr_page,
                qr_size_cm=qr_pdf_config.qr_size_cm,
                qr_margin_y_cm=qr_pdf_config.qr_margin_y_cm,
                qr_rect=qr_pdf_config.qr_rect,
            )
            return result

        except Exception as e:
            logger.error("qr_insertion_failed", item_id=str(item.item_id), error=str(e))
            item.set_failed("qr_insertion", str(e))
            raise

    async def _upload_result(
        self, job: BatchJob, item: BatchItem, file_path: Path
    ) -> dict:
        """Upload result PDF to file-svc."""
        log = logger.bind(item_id=str(item.item_id))

        try:
            result = await self.file_repository.upload_and_wait(
                user_id=item.user_id,
                project_id=job.project_id,
                file_path=str(file_path),
                file_name=f"{item.serial_code}.pdf",
                is_public=item.is_public,
            )

            if not result.get("success"):
                raise RuntimeError(f"Upload failed: {result.get('error', 'Unknown error')}")

            log.debug("upload_completed", file_id=result.get("file_id"))
            return result

        except Exception as e:
            log.error("upload_failed", error=str(e))
            item.set_failed("upload", str(e))
            raise

    def _cleanup_temp_dir(self, temp_dir: Path) -> None:
        """Clean up temporary directory."""
        try:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
        except Exception as e:
            logger.warning("cleanup_failed", path=str(temp_dir), error=str(e))

    async def process_item_local(
        self,
        template_bytes: bytes,
        pdf_items: list[dict[str, str]],
        qr_config: list[dict[str, str]],
        qr_pdf_config: list[dict[str, str]],
    ) -> bytes:
        """
        Process a single PDF locally (without file-svc events).

        Used for testing and direct processing.

        Args:
            template_bytes: PDF template as bytes
            pdf_items: Placeholder replacements
            qr_config: QR code configuration
            qr_pdf_config: QR insertion configuration

        Returns:
            Processed PDF as bytes
        """
        # Step 1: Render
        rendered = await self.pdf_replace_service.render_pdf_bytes_async(
            template_pdf=template_bytes,
            pdf_items=pdf_items,
        )

        # Step 2: Generate QR
        qr_cfg = QrConfig.from_list(qr_config)
        if not qr_cfg.base_url or not qr_cfg.verify_code:
            raise ValueError("QR config requires base_url and verify_code")

        qr_bytes = await self.qr_service.generate_png_async(
            base_url=qr_cfg.base_url,
            verify_code=qr_cfg.verify_code,
        )

        # Step 3: Insert QR
        qr_pdf_cfg = QrPdfConfig.from_list(qr_pdf_config)
        final_pdf = await self.pdf_qr_insert_service.insert_qr_bytes_async(
            input_pdf=rendered,
            qr_png=qr_bytes,
            qr_page=qr_pdf_cfg.qr_page,
            qr_size_cm=qr_pdf_cfg.qr_size_cm,
            qr_margin_y_cm=qr_pdf_cfg.qr_margin_y_cm,
            qr_rect=qr_pdf_cfg.qr_rect,
        )

        return final_pdf
