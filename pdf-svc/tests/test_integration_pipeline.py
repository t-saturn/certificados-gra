"""
Integration tests for the complete PDF processing pipeline.
5 tests that simulate the full flow with clear REQUEST/RESPONSE display.
These tests work WITHOUT requiring the service to be running.
"""

from __future__ import annotations

import json
from uuid import uuid4

import fitz
import pytest

from pdf_svc.dto.pdf_request import QrConfig, QrPdfConfig
from pdf_svc.models.job import BatchItem, BatchJob, ItemData, ItemStatus, JobStatus
from pdf_svc.services.pdf_orchestrator import PdfOrchestrator
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.pdf_replace_service import PdfReplaceService
from pdf_svc.services.qr_service import QrService


def print_request(pdf_job_id: str, items: list[dict]) -> None:
    """Print formatted request."""
    print("\n" + "=" * 70)
    print("📤 REQUEST: pdf.batch.requested")
    print("=" * 70)
    request = {
        "event_type": "pdf.batch.requested",
        "payload": {
            "pdf_job_id": pdf_job_id,
            "items": items,
        }
    }
    print(json.dumps(request, indent=2, ensure_ascii=False))
    print("-" * 70)


def print_response(job: BatchJob) -> None:
    """Print formatted response."""
    print("\n" + "-" * 70)
    print("📥 RESPONSE: pdf.batch.completed")
    print("-" * 70)
    response = job.to_response()
    print(json.dumps(response, indent=2, ensure_ascii=False, default=str))
    print("=" * 70)


@pytest.fixture
def sample_template() -> bytes:
    """Create a sample PDF template with placeholders."""
    doc = fitz.open()
    page = doc.new_page(width=792, height=612)  # Landscape
    page.insert_text((100, 100), "CERTIFICADO", fontsize=24)
    page.insert_text((100, 180), "Se certifica que: {{nombre}}", fontsize=14)
    page.insert_text((100, 220), "ha completado el curso: {{curso}}", fontsize=12)
    page.insert_text((100, 260), "Fecha: {{fecha}}", fontsize=12)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


@pytest.fixture
def orchestrator(tmp_path) -> PdfOrchestrator:
    """Create orchestrator for local processing."""
    return PdfOrchestrator(
        qr_service=QrService(),
        pdf_replace_service=PdfReplaceService(),
        pdf_qr_insert_service=PdfQrInsertService(),
        file_repository=None,  # type: ignore
        job_repository=None,  # type: ignore
        temp_dir=str(tmp_path),
    )


@pytest.mark.integration
class TestPipelineSimulation:
    """Integration tests simulating full pipeline - 5 tests."""

    async def test_single_item_success(
        self, orchestrator: PdfOrchestrator, sample_template: bytes
    ) -> None:
        """Simulate: Single item batch - SUCCESS."""
        pdf_job_id = str(uuid4())
        user_id = uuid4()
        
        items = [{
            "user_id": str(user_id),
            "template_id": str(uuid4()),
            "serial_code": "CERT-2025-000001",
            "is_public": True,
            "pdf": [
                {"key": "nombre", "value": "MARÍA LUQUE RIVERA"},
                {"key": "curso", "value": "Python Avanzado"},
                {"key": "fecha", "value": "28/12/2024"},
            ],
            "qr": [
                {"base_url": "https://verify.gob.pe"},
                {"verify_code": "CERT-2025-000001"},
            ],
            "qr_pdf": [
                {"qr_size_cm": "2.5"},
                {"qr_page": "0"},
            ],
        }]
        
        print_request(pdf_job_id, items)
        
        # Create job and process
        job = BatchJob(pdf_job_id=uuid4())
        item = BatchItem(
            user_id=user_id,
            template_id=uuid4(),
            serial_code="CERT-2025-000001",
            pdf_items=items[0]["pdf"],
            qr_config=items[0]["qr"],
            qr_pdf_config=items[0]["qr_pdf"],
        )
        job.add_item(item)
        job.start_processing()
        
        # Process locally
        result = await orchestrator.process_item_local(
            template_bytes=sample_template,
            pdf_items=items[0]["pdf"],
            qr_config=items[0]["qr"],
            qr_pdf_config=items[0]["qr_pdf"],
        )
        
        # Mark completed
        item.set_completed(ItemData(
            file_id=uuid4(),
            file_name="CERT-2025-000001.pdf",
            file_size=len(result),
            download_url="https://files.example.com/CERT-2025-000001.pdf",
        ))
        job.finalize()
        
        print_response(job)
        
        assert job.status == JobStatus.COMPLETED
        assert job.success_count == 1
        assert job.failed_count == 0

    async def test_multiple_items_all_success(
        self, orchestrator: PdfOrchestrator, sample_template: bytes
    ) -> None:
        """Simulate: Multiple items - ALL SUCCESS."""
        pdf_job_id = str(uuid4())
        
        items = [
            {
                "user_id": str(uuid4()),
                "template_id": str(uuid4()),
                "serial_code": f"CERT-2025-{i:06d}",
                "pdf": [
                    {"key": "nombre", "value": f"Usuario {i}"},
                    {"key": "curso", "value": "Curso de Prueba"},
                    {"key": "fecha", "value": "28/12/2024"},
                ],
                "qr": [
                    {"base_url": "https://verify.gob.pe"},
                    {"verify_code": f"CERT-2025-{i:06d}"},
                ],
                "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
            }
            for i in range(1, 4)  # 3 items
        ]
        
        print_request(pdf_job_id, items)
        
        # Create and process job
        job = BatchJob(pdf_job_id=uuid4())
        
        for item_data in items:
            batch_item = BatchItem(
                user_id=uuid4(),
                template_id=uuid4(),
                serial_code=item_data["serial_code"],
                pdf_items=item_data["pdf"],
                qr_config=item_data["qr"],
                qr_pdf_config=item_data["qr_pdf"],
            )
            
            result = await orchestrator.process_item_local(
                template_bytes=sample_template,
                pdf_items=item_data["pdf"],
                qr_config=item_data["qr"],
                qr_pdf_config=item_data["qr_pdf"],
            )
            
            batch_item.set_completed(ItemData(
                file_id=uuid4(),
                file_name=f"{item_data['serial_code']}.pdf",
                file_size=len(result),
            ))
            job.add_item(batch_item)
        
        job.start_processing()
        job.finalize()
        
        print_response(job)
        
        assert job.status == JobStatus.COMPLETED
        assert job.success_count == 3
        assert job.failed_count == 0

    async def test_partial_failure(
        self, orchestrator: PdfOrchestrator, sample_template: bytes
    ) -> None:
        """Simulate: Mixed results - PARTIAL (some fail)."""
        pdf_job_id = str(uuid4())
        
        items = [
            {
                "user_id": str(uuid4()),
                "serial_code": "CERT-2025-000001",
                "pdf": [{"key": "nombre", "value": "Usuario 1"}],
                "qr": [{"base_url": "https://verify.gob.pe"}, {"verify_code": "CERT-001"}],
                "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
            },
            {
                "user_id": str(uuid4()),
                "serial_code": "CERT-2025-000002",
                "pdf": [{"key": "nombre", "value": "Usuario 2"}],
                "qr": [{"base_url": ""}, {"verify_code": ""}],  # Invalid - will fail
                "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
            },
            {
                "user_id": str(uuid4()),
                "serial_code": "CERT-2025-000003",
                "pdf": [{"key": "nombre", "value": "Usuario 3"}],
                "qr": [{"base_url": "https://verify.gob.pe"}, {"verify_code": "CERT-003"}],
                "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
            },
        ]
        
        print_request(pdf_job_id, items)
        
        job = BatchJob(pdf_job_id=uuid4())
        job.start_processing()
        
        for item_data in items:
            user_id = uuid4()
            batch_item = BatchItem(
                user_id=user_id,
                template_id=uuid4(),
                serial_code=item_data["serial_code"],
            )
            
            try:
                result = await orchestrator.process_item_local(
                    template_bytes=sample_template,
                    pdf_items=item_data["pdf"],
                    qr_config=item_data["qr"],
                    qr_pdf_config=item_data["qr_pdf"],
                )
                batch_item.set_completed(ItemData(
                    file_id=uuid4(),
                    file_name=f"{item_data['serial_code']}.pdf",
                    file_size=len(result),
                ))
            except Exception as e:
                batch_item.set_failed(
                    stage="qr_generation",
                    message=str(e),
                    code="QR_ERROR",
                )
            
            job.add_item(batch_item)
        
        job.finalize()
        
        print_response(job)
        
        assert job.status == JobStatus.PARTIAL
        assert job.success_count == 2
        assert job.failed_count == 1

    async def test_all_items_fail(self, orchestrator: PdfOrchestrator) -> None:
        """Simulate: All items fail - FAILED."""
        pdf_job_id = str(uuid4())
        
        items = [
            {
                "user_id": str(uuid4()),
                "serial_code": f"CERT-FAIL-{i:03d}",
                "pdf": [{"key": "nombre", "value": f"Usuario {i}"}],
                "qr": [{"base_url": ""}, {"verify_code": ""}],  # Invalid
                "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
            }
            for i in range(1, 3)
        ]
        
        print_request(pdf_job_id, items)
        
        job = BatchJob(pdf_job_id=uuid4())
        job.start_processing()
        
        for item_data in items:
            user_id = uuid4()
            batch_item = BatchItem(
                user_id=user_id,
                template_id=uuid4(),
                serial_code=item_data["serial_code"],
            )
            
            # All will fail due to invalid QR config
            batch_item.set_failed(
                stage="validation",
                message="Invalid QR configuration: empty base_url",
                code="VALIDATION_ERROR",
            )
            job.add_item(batch_item)
        
        job.finalize()
        
        print_response(job)
        
        assert job.status == JobStatus.FAILED
        assert job.success_count == 0
        assert job.failed_count == 2

    def test_dto_parsing(self) -> None:
        """Test DTO parsing from request format."""
        print("\n" + "=" * 70)
        print("TEST: DTO Parsing")
        print("=" * 70)
        
        # QR Config
        qr_items = [
            {"base_url": "https://verify.gob.pe"},
            {"verify_code": "CERT-2025-000001"},
        ]
        print(f"INPUT qr:")
        print(f"  {qr_items}")
        
        qr_config = QrConfig.from_list(qr_items)
        print(f"OUTPUT QrConfig:")
        print(f"  base_url:    {qr_config.base_url}")
        print(f"  verify_code: {qr_config.verify_code}")
        
        # QR PDF Config
        qr_pdf_items = [
            {"qr_size_cm": "2.5"},
            {"qr_margin_y_cm": "1.0"},
            {"qr_page": "0"},
            {"qr_rect": "460,40,540,120"},
        ]
        print(f"\nINPUT qr_pdf:")
        print(f"  {qr_pdf_items}")
        
        qr_pdf_config = QrPdfConfig.from_list(qr_pdf_items)
        print(f"OUTPUT QrPdfConfig:")
        print(f"  qr_size_cm:     {qr_pdf_config.qr_size_cm}")
        print(f"  qr_margin_y_cm: {qr_pdf_config.qr_margin_y_cm}")
        print(f"  qr_page:        {qr_pdf_config.qr_page}")
        print(f"  qr_rect:        {qr_pdf_config.qr_rect}")
        print("=" * 70)
        
        assert qr_config.base_url == "https://verify.gob.pe"
        assert qr_config.verify_code == "CERT-2025-000001"
        assert qr_pdf_config.qr_size_cm == 2.5
        assert qr_pdf_config.qr_rect == (460.0, 40.0, 540.0, 120.0)
