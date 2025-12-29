"""
Local pipeline tests - run WITHOUT external services.

These tests simulate the processing pipeline locally without
connecting to NATS, Redis, or file-svc.

USAGE:
    make test-unit
"""

from __future__ import annotations

import json
from uuid import uuid4

import fitz
import pytest

from pdf_svc.dto.pdf_request import QrConfig, QrPdfConfig
from pdf_svc.services.pdf_orchestrator import PdfOrchestrator
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.pdf_replace_service import PdfReplaceService
from pdf_svc.services.qr_service import QrService


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
        template_cache=None,  # type: ignore - not needed for local processing
    )


@pytest.mark.unit
class TestLocalPipeline:
    """Local pipeline simulation tests - NO external services required."""

    async def test_local_pdf_generation(
        self, orchestrator: PdfOrchestrator, sample_template: bytes
    ) -> None:
        """Test local PDF generation without file-svc."""
        print("\n" + "=" * 70)
        print("TEST: Local PDF Generation")
        print("=" * 70)

        pdf_items = [
            {"key": "nombre", "value": "USUARIO LOCAL"},
            {"key": "curso", "value": "Test Local"},
            {"key": "fecha", "value": "29/12/2024"},
        ]
        qr_config = [
            {"base_url": "https://verify.local"},
            {"verify_code": "LOCAL-001"},
        ]
        qr_pdf_config = [
            {"qr_size_cm": "2.5"},
            {"qr_page": "0"},
        ]

        print(f"INPUT:")
        print(f"  Template size: {len(sample_template):,} bytes")
        print(f"  Placeholders:  {len(pdf_items)}")
        print("-" * 70)

        result = await orchestrator.process_item_local(
            template_bytes=sample_template,
            pdf_items=pdf_items,
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config,
        )

        print(f"OUTPUT:")
        print(f"  PDF size: {len(result):,} bytes")
        print(f"  Valid PDF: {result[:4] == b'%PDF'}")
        print("=" * 70)

        assert result[:4] == b"%PDF"
        assert len(result) > len(sample_template)

    async def test_local_with_special_chars(
        self, orchestrator: PdfOrchestrator, sample_template: bytes
    ) -> None:
        """Test PDF with special characters."""
        print("\n" + "=" * 70)
        print("TEST: Special Characters")
        print("=" * 70)

        pdf_items = [
            {"key": "nombre", "value": "MARÍA JOSÉ GARCÍA-ÑOÑO"},
            {"key": "curso", "value": "Programación & Diseño"},
            {"key": "fecha", "value": "29/12/2024"},
        ]

        print(f"INPUT:")
        for item in pdf_items:
            print(f"  {item['key']}: {item['value']}")
        print("-" * 70)

        result = await orchestrator.process_item_local(
            template_bytes=sample_template,
            pdf_items=pdf_items,
            qr_config=[
                {"base_url": "https://verify.local"},
                {"verify_code": "SPECIAL-001"},
            ],
            qr_pdf_config=[{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
        )

        print(f"OUTPUT:")
        print(f"  PDF size: {len(result):,} bytes")
        print(f"  Status: ✓ Generated")
        print("=" * 70)

        assert result[:4] == b"%PDF"

    def test_dto_parsing(self) -> None:
        """Test DTO parsing from request format."""
        print("\n" + "=" * 70)
        print("TEST: DTO Parsing")
        print("=" * 70)

        qr_items = [
            {"base_url": "https://verify.gob.pe"},
            {"verify_code": "CERT-2025-000001"},
        ]
        qr_config = QrConfig.from_list(qr_items)

        print(f"QrConfig:")
        print(f"  base_url:    {qr_config.base_url}")
        print(f"  verify_code: {qr_config.verify_code}")

        qr_pdf_items = [
            {"qr_size_cm": "2.5"},
            {"qr_page": "0"},
            {"qr_rect": "460,40,540,120"},
        ]
        qr_pdf_config = QrPdfConfig.from_list(qr_pdf_items)

        print(f"QrPdfConfig:")
        print(f"  qr_size_cm: {qr_pdf_config.qr_size_cm}")
        print(f"  qr_page:    {qr_pdf_config.qr_page}")
        print(f"  qr_rect:    {qr_pdf_config.qr_rect}")
        print("=" * 70)

        assert qr_config.base_url == "https://verify.gob.pe"
        assert qr_pdf_config.qr_rect == (460.0, 40.0, 540.0, 120.0)
