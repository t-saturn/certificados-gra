"""
Integration tests for the complete PDF processing pipeline.

Tests the full flow: template → render → QR → insert → output
(without file-svc events, using local processing)
"""

from __future__ import annotations

from pathlib import Path

import fitz
import pytest

from pdf_svc.dto.pdf_request import QrConfig, QrPdfConfig
from pdf_svc.services.pdf_orchestrator import PdfOrchestrator
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.pdf_replace_service import PdfReplaceService
from pdf_svc.services.qr_service import QrService


class TestPipelineIntegration:
    """Integration tests for the complete processing pipeline."""

    @pytest.fixture
    def orchestrator(self, temp_dir: Path) -> PdfOrchestrator:
        """Create orchestrator for local processing (no file-svc)."""
        return PdfOrchestrator(
            qr_service=QrService(),
            pdf_replace_service=PdfReplaceService(),
            pdf_qr_insert_service=PdfQrInsertService(),
            file_repository=None,  # type: ignore
            job_repository=None,  # type: ignore
            temp_dir=str(temp_dir),
        )

    # -- Full Pipeline Tests
    @pytest.mark.integration
    async def test_full_pipeline_landscape(
        self,
        orchestrator: PdfOrchestrator,
        sample_pdf_with_placeholders: bytes,
        pdf_items: list,
        qr_config: list,
        qr_pdf_config: list,
    ) -> None:
        """Test complete pipeline with landscape PDF."""
        result = await orchestrator.process_item_local(
            template_bytes=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config,
        )

        # Verify output is valid PDF
        assert result is not None
        assert result[:4] == b"%PDF"

        # Verify PDF can be opened
        doc = fitz.open(stream=result, filetype="pdf")
        assert len(doc) >= 1
        doc.close()

    @pytest.mark.integration
    async def test_full_pipeline_portrait_with_rect(
        self,
        orchestrator: PdfOrchestrator,
        sample_portrait_pdf: bytes,
        pdf_items: list,
        qr_config: list,
        qr_pdf_config_with_rect: list,
    ) -> None:
        """Test complete pipeline with portrait PDF and explicit QR rect."""
        result = await orchestrator.process_item_local(
            template_bytes=sample_portrait_pdf,
            pdf_items=pdf_items,
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config_with_rect,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.integration
    async def test_pipeline_preserves_pdf_structure(
        self,
        orchestrator: PdfOrchestrator,
        sample_pdf_with_placeholders: bytes,
        pdf_items: list,
        qr_config: list,
        qr_pdf_config: list,
    ) -> None:
        """Test that pipeline preserves PDF structure."""
        # Get original page count
        original_doc = fitz.open(stream=sample_pdf_with_placeholders, filetype="pdf")
        original_pages = len(original_doc)
        original_doc.close()

        result = await orchestrator.process_item_local(
            template_bytes=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config,
        )

        result_doc = fitz.open(stream=result, filetype="pdf")
        assert len(result_doc) == original_pages
        result_doc.close()

    # -- Error Handling Tests
    @pytest.mark.integration
    async def test_pipeline_invalid_qr_config(
        self,
        orchestrator: PdfOrchestrator,
        sample_pdf_with_placeholders: bytes,
        pdf_items: list,
        qr_pdf_config: list,
    ) -> None:
        """Test pipeline with invalid QR config."""
        invalid_qr_config = [
            {"base_url": ""},  # Empty base_url
            {"verify_code": ""},  # Empty verify_code
        ]

        with pytest.raises(ValueError):
            await orchestrator.process_item_local(
                template_bytes=sample_pdf_with_placeholders,
                pdf_items=pdf_items,
                qr_config=invalid_qr_config,
                qr_pdf_config=qr_pdf_config,
            )

    @pytest.mark.integration
    async def test_pipeline_missing_qr_config(
        self,
        orchestrator: PdfOrchestrator,
        sample_pdf_with_placeholders: bytes,
        pdf_items: list,
        qr_pdf_config: list,
    ) -> None:
        """Test pipeline with missing QR config."""
        with pytest.raises(ValueError):
            await orchestrator.process_item_local(
                template_bytes=sample_pdf_with_placeholders,
                pdf_items=pdf_items,
                qr_config=[],  # Empty
                qr_pdf_config=qr_pdf_config,
            )

    @pytest.mark.integration
    async def test_pipeline_invalid_pdf(
        self,
        orchestrator: PdfOrchestrator,
        pdf_items: list,
        qr_config: list,
        qr_pdf_config: list,
    ) -> None:
        """Test pipeline with invalid PDF bytes."""
        with pytest.raises(Exception):
            await orchestrator.process_item_local(
                template_bytes=b"not a valid pdf",
                pdf_items=pdf_items,
                qr_config=qr_config,
                qr_pdf_config=qr_pdf_config,
            )

    # -- Edge Cases
    @pytest.mark.integration
    async def test_pipeline_no_placeholders(
        self,
        orchestrator: PdfOrchestrator,
        sample_landscape_pdf: bytes,
        qr_config: list,
        qr_pdf_config: list,
    ) -> None:
        """Test pipeline with PDF that has no placeholders."""
        result = await orchestrator.process_item_local(
            template_bytes=sample_landscape_pdf,
            pdf_items=[],
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.integration
    async def test_pipeline_special_characters(
        self,
        orchestrator: PdfOrchestrator,
        sample_pdf_with_placeholders: bytes,
        qr_pdf_config: list,
    ) -> None:
        """Test pipeline with special characters."""
        pdf_items = [
            {"key": "nombre_participante", "value": "MARÍA JOSÉ GARCÍA-ÑOÑO"},
            {"key": "fecha", "value": "28/12/2024"},
            {"key": "curso", "value": "Programación & Diseño"},
        ]

        qr_config = [
            {"base_url": "https://example.com/verify"},
            {"verify_code": "CERT-ÑOÑO-2025-001"},
        ]

        result = await orchestrator.process_item_local(
            template_bytes=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.integration
    async def test_pipeline_multi_page_pdf(
        self,
        orchestrator: PdfOrchestrator,
        qr_config: list,
    ) -> None:
        """Test pipeline with multi-page PDF."""
        # Create multi-page PDF
        doc = fitz.open()
        for i in range(3):
            page = doc.new_page(width=792, height=612)
            page.insert_text((100, 100), f"Page {i + 1} - {{{{nombre}}}}", fontsize=12)
        pdf_bytes = doc.write()
        doc.close()

        pdf_items = [{"key": "nombre", "value": "Test User"}]
        qr_pdf_config = [
            {"qr_size_cm": "2.0"},
            {"qr_page": "2"},  # Insert on last page
        ]

        result = await orchestrator.process_item_local(
            template_bytes=pdf_bytes,
            pdf_items=pdf_items,
            qr_config=qr_config,
            qr_pdf_config=qr_pdf_config,
        )

        result_doc = fitz.open(stream=result, filetype="pdf")
        assert len(result_doc) == 3
        result_doc.close()


class TestDTOParsing:
    """Tests for DTO parsing from request format."""

    @pytest.mark.integration
    def test_qr_config_from_list(self) -> None:
        """Test QrConfig parsing from list format."""
        items = [
            {"base_url": "https://example.com/verify"},
            {"verify_code": "TEST-001"},
        ]

        config = QrConfig.from_list(items)

        assert config.base_url == "https://example.com/verify"
        assert config.verify_code == "TEST-001"

    @pytest.mark.integration
    def test_qr_pdf_config_from_list(self) -> None:
        """Test QrPdfConfig parsing from list format."""
        items = [
            {"qr_size_cm": "2.5"},
            {"qr_margin_y_cm": "1.0"},
            {"qr_page": "0"},
        ]

        config = QrPdfConfig.from_list(items)

        assert config.qr_size_cm == 2.5
        assert config.qr_margin_y_cm == 1.0
        assert config.qr_page == 0
        assert config.qr_rect is None

    @pytest.mark.integration
    def test_qr_pdf_config_with_rect(self) -> None:
        """Test QrPdfConfig parsing with rect."""
        items = [
            {"qr_size_cm": "2.0"},
            {"qr_page": "0"},
            {"qr_rect": "460,40,540,120"},
        ]

        config = QrPdfConfig.from_list(items)

        assert config.qr_rect == (460.0, 40.0, 540.0, 120.0)
