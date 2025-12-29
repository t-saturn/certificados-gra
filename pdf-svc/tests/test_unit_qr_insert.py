"""
Unit tests for PdfQrInsertService.

Tests QR code insertion into PDF documents.
"""

from __future__ import annotations

import fitz
import pytest

from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.qr_service import QrService


class TestPdfQrInsertService:
    """Unit tests for PDF QR insertion service."""

    @pytest.fixture
    def service(self) -> PdfQrInsertService:
        """Create PDF QR insert service."""
        return PdfQrInsertService()

    @pytest.fixture
    def qr_png(self) -> bytes:
        """Generate a test QR PNG."""
        qr_service = QrService()
        return qr_service.generate_png(
            base_url="https://test.com",
            verify_code="TEST-001",
            scale=10,
        )

    # -------------------------------------------------------------------------
    # Landscape Auto-Placement Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_insert_qr_landscape_auto_placement(
        self, service: PdfQrInsertService, sample_landscape_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test QR insertion in landscape page with auto-placement."""
        result = service.insert_qr_bytes(
            input_pdf=sample_landscape_pdf,
            qr_png=qr_png,
            qr_page=0,
            qr_size_cm=2.5,
            qr_margin_y_cm=1.0,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

        # Verify PDF is valid
        doc = fitz.open(stream=result, filetype="pdf")
        assert len(doc) == 1
        doc.close()

    @pytest.mark.unit
    def test_insert_qr_landscape_custom_size(
        self, service: PdfQrInsertService, sample_landscape_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test QR insertion with custom sizes."""
        # Small QR
        result_small = service.insert_qr_bytes(
            input_pdf=sample_landscape_pdf,
            qr_png=qr_png,
            qr_page=0,
            qr_size_cm=1.0,
        )

        # Large QR
        result_large = service.insert_qr_bytes(
            input_pdf=sample_landscape_pdf,
            qr_png=qr_png,
            qr_page=0,
            qr_size_cm=5.0,
        )

        assert result_small[:4] == b"%PDF"
        assert result_large[:4] == b"%PDF"

    # -------------------------------------------------------------------------
    # Portrait with Rect Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_insert_qr_portrait_with_rect(
        self, service: PdfQrInsertService, sample_portrait_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test QR insertion in portrait page with explicit rect."""
        result = service.insert_qr_bytes(
            input_pdf=sample_portrait_pdf,
            qr_png=qr_png,
            qr_page=0,
            qr_rect=(460, 40, 540, 120),
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.unit
    def test_insert_qr_portrait_without_rect_raises(
        self, service: PdfQrInsertService, sample_portrait_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test that portrait page without rect raises ValueError."""
        with pytest.raises(ValueError, match="qr_rect.*PORTRAIT"):
            service.insert_qr_bytes(
                input_pdf=sample_portrait_pdf,
                qr_png=qr_png,
                qr_page=0,
                # No qr_rect provided
            )

    # -------------------------------------------------------------------------
    # Validation Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_insert_qr_invalid_page_raises(
        self, service: PdfQrInsertService, sample_portrait_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test that invalid page index raises IndexError."""
        with pytest.raises(IndexError):
            service.insert_qr_bytes(
                input_pdf=sample_portrait_pdf,
                qr_png=qr_png,
                qr_page=5,  # PDF only has 1 page
                qr_rect=(100, 100, 200, 200),
            )

    @pytest.mark.unit
    def test_insert_qr_invalid_pdf(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test with invalid PDF bytes."""
        with pytest.raises(Exception):
            service.insert_qr_bytes(
                input_pdf=b"not a valid pdf",
                qr_png=qr_png,
                qr_page=0,
            )

    @pytest.mark.unit
    def test_insert_qr_invalid_png(
        self, service: PdfQrInsertService, sample_landscape_pdf: bytes
    ) -> None:
        """Test with invalid PNG bytes."""
        with pytest.raises(Exception):
            service.insert_qr_bytes(
                input_pdf=sample_landscape_pdf,
                qr_png=b"not a valid png",
                qr_page=0,
            )

    # -------------------------------------------------------------------------
    # Content Preservation Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_insert_qr_preserves_content(
        self, service: PdfQrInsertService, sample_landscape_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test that QR insertion preserves existing content."""
        result = service.insert_qr_bytes(
            input_pdf=sample_landscape_pdf,
            qr_png=qr_png,
            qr_page=0,
        )

        doc = fitz.open(stream=result, filetype="pdf")
        text = doc[0].get_text()
        assert "Landscape" in text
        doc.close()

    @pytest.mark.unit
    def test_insert_qr_preserves_dimensions(
        self, service: PdfQrInsertService, sample_landscape_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test that QR insertion preserves PDF dimensions."""
        # Get original dimensions
        original_doc = fitz.open(stream=sample_landscape_pdf, filetype="pdf")
        original_rect = original_doc[0].rect
        original_doc.close()

        result = service.insert_qr_bytes(
            input_pdf=sample_landscape_pdf,
            qr_png=qr_png,
            qr_page=0,
        )

        # Check dimensions
        result_doc = fitz.open(stream=result, filetype="pdf")
        result_rect = result_doc[0].rect
        result_doc.close()

        assert result_rect.width == original_rect.width
        assert result_rect.height == original_rect.height

    # -------------------------------------------------------------------------
    # Multi-Page Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_insert_qr_multi_page(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test QR insertion on specific page of multi-page PDF."""
        # Create multi-page PDF
        doc = fitz.open()
        for i in range(3):
            page = doc.new_page(width=792, height=612)  # Landscape
            page.insert_text((100, 100), f"Page {i + 1}", fontsize=12)
        pdf_bytes = doc.write()
        doc.close()

        # Insert QR on page 2 (index 1)
        result = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=1,
        )

        assert result is not None
        result_doc = fitz.open(stream=result, filetype="pdf")
        assert len(result_doc) == 3
        result_doc.close()

    # -------------------------------------------------------------------------
    # Async Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    async def test_insert_qr_bytes_async(
        self, service: PdfQrInsertService, sample_landscape_pdf: bytes, qr_png: bytes
    ) -> None:
        """Test async QR insertion."""
        result = await service.insert_qr_bytes_async(
            input_pdf=sample_landscape_pdf,
            qr_png=qr_png,
            qr_page=0,
        )

        assert result is not None
        assert result[:4] == b"%PDF"
