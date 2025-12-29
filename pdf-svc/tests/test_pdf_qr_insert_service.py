"""
Tests for PdfQrInsertService.
"""

from __future__ import annotations

from io import BytesIO

import fitz
import pytest

from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService


def create_test_pdf(width: float = 612, height: float = 792) -> bytes:
    """Create a test PDF with specified dimensions."""
    doc = fitz.open()
    page = doc.new_page(width=width, height=height)
    page.insert_text((100, 100), "Test Document", fontsize=12)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


def create_landscape_pdf() -> bytes:
    """Create a landscape orientation PDF."""
    return create_test_pdf(width=792, height=612)  # Landscape


def create_portrait_pdf() -> bytes:
    """Create a portrait orientation PDF."""
    return create_test_pdf(width=612, height=792)  # Portrait


class TestPdfQrInsertService:
    """Tests for PDF QR insertion service."""

    @pytest.fixture
    def service(self) -> PdfQrInsertService:
        """Create PDF QR insert service."""
        return PdfQrInsertService()

    @pytest.fixture
    def qr_png(self) -> bytes:
        """Generate a test QR PNG."""
        from pdf_svc.services.qr_service import QrService

        qr_service = QrService()
        return qr_service.generate_png(
            base_url="https://test.com",
            verify_code="TEST-001",
            scale=10,
        )

    @pytest.mark.unit
    def test_insert_qr_landscape_auto_placement(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test QR insertion in landscape page with auto-placement."""
        pdf_bytes = create_landscape_pdf()

        result = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=0,
            qr_size_cm=2.5,
            qr_margin_y_cm=1.0,
        )

        assert result is not None
        assert result[:4] == b"%PDF"
        # Verify PDF is valid and can be opened
        doc = fitz.open(stream=result, filetype="pdf")
        assert len(doc) == 1
        doc.close()

    @pytest.mark.unit
    def test_insert_qr_portrait_with_rect(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test QR insertion in portrait page with explicit rect."""
        pdf_bytes = create_portrait_pdf()

        result = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=0,
            qr_rect=(460, 40, 540, 120),
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.unit
    def test_insert_qr_portrait_without_rect_raises(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test that portrait page without rect raises ValueError."""
        pdf_bytes = create_portrait_pdf()

        with pytest.raises(ValueError, match="qr_rect is required for PORTRAIT"):
            service.insert_qr_bytes(
                input_pdf=pdf_bytes,
                qr_png=qr_png,
                qr_page=0,
                # No qr_rect provided
            )

    @pytest.mark.unit
    def test_insert_qr_invalid_page_raises(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test that invalid page index raises IndexError."""
        pdf_bytes = create_portrait_pdf()

        with pytest.raises(IndexError):
            service.insert_qr_bytes(
                input_pdf=pdf_bytes,
                qr_png=qr_png,
                qr_page=5,  # PDF only has 1 page
                qr_rect=(100, 100, 200, 200),
            )

    @pytest.mark.unit
    def test_insert_qr_preserves_content(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test that QR insertion preserves existing content."""
        pdf_bytes = create_landscape_pdf()

        result = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=0,
        )

        doc = fitz.open(stream=result, filetype="pdf")
        text = doc[0].get_text()
        assert "Test Document" in text
        doc.close()

    @pytest.mark.unit
    async def test_insert_qr_bytes_async(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test async QR insertion."""
        pdf_bytes = create_landscape_pdf()

        result = await service.insert_qr_bytes_async(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=0,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.unit
    def test_insert_qr_custom_size(
        self, service: PdfQrInsertService, qr_png: bytes
    ) -> None:
        """Test QR insertion with custom size."""
        pdf_bytes = create_landscape_pdf()

        # Small QR
        result_small = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=0,
            qr_size_cm=1.0,
        )

        # Large QR
        result_large = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_page=0,
            qr_size_cm=5.0,
        )

        # Both should be valid PDFs
        assert result_small[:4] == b"%PDF"
        assert result_large[:4] == b"%PDF"

    @pytest.mark.unit
    def test_insert_qr_multiple_pages(
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
