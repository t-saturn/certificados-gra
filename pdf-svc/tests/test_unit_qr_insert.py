"""
Unit tests for PDF QR Insert Service.
3 tests that simulate QR insertion with clear input/output display.
"""

import fitz
import pytest
from pdf_svc.services.pdf_qr_insert_service import PdfQrInsertService
from pdf_svc.services.qr_service import QrService


@pytest.mark.unit
class TestPdfQrInsertService:
    """PDF QR Insert Service unit tests - 3 tests."""

    @pytest.fixture
    def landscape_pdf(self) -> bytes:
        """Create landscape PDF."""
        doc = fitz.open()
        page = doc.new_page(width=792, height=612)  # Landscape
        page.insert_text((100, 100), "Certificate - Landscape", fontsize=14)
        pdf_bytes = doc.write()
        doc.close()
        return pdf_bytes

    @pytest.fixture
    def portrait_pdf(self) -> bytes:
        """Create portrait PDF."""
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)  # Portrait
        page.insert_text((100, 100), "Certificate - Portrait", fontsize=14)
        pdf_bytes = doc.write()
        doc.close()
        return pdf_bytes

    @pytest.fixture
    def qr_png(self) -> bytes:
        """Generate QR PNG."""
        service = QrService()
        return service.generate_png(base_url="https://verify.example.com", verify_code="TEST-001")

    def test_insert_qr_landscape(self, landscape_pdf: bytes, qr_png: bytes) -> None:
        """Test QR insertion in landscape PDF."""
        service = PdfQrInsertService()
        
        qr_size_cm = 2.5
        qr_page = 0
        
        print("\n" + "=" * 70)
        print("TEST: QR Insert - Landscape PDF")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:    {len(landscape_pdf):,} bytes (landscape 792x612)")
        print(f"  QR PNG:      {len(qr_png):,} bytes")
        print(f"  QR size:     {qr_size_cm} cm")
        print(f"  Page:        {qr_page}")
        print("-" * 70)
        
        result = service.insert_qr_bytes(
            input_pdf=landscape_pdf,
            qr_png=qr_png,
            qr_size_cm=qr_size_cm,
            qr_page=qr_page,
        )
        
        doc = fitz.open(stream=result, filetype="pdf")
        images = doc[0].get_images()
        doc.close()
        
        print(f"OUTPUT:")
        print(f"  PDF size:    {len(result):,} bytes")
        print(f"  Images:      {len(images)} (QR inserted)")
        print(f"  Position:    Bottom-center (auto)")
        print("=" * 70)
        
        assert len(result) > len(landscape_pdf)
        assert len(images) >= 1

    def test_insert_qr_portrait_with_rect(self, portrait_pdf: bytes, qr_png: bytes) -> None:
        """Test QR insertion in portrait PDF with explicit rect."""
        service = PdfQrInsertService()
        
        qr_rect = (460, 40, 540, 120)  # Explicit position
        
        print("\n" + "=" * 70)
        print("TEST: QR Insert - Portrait PDF with Rect")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:    {len(portrait_pdf):,} bytes (portrait 612x792)")
        print(f"  QR PNG:      {len(qr_png):,} bytes")
        print(f"  QR rect:     {qr_rect}")
        print("-" * 70)
        
        result = service.insert_qr_bytes(
            input_pdf=portrait_pdf,
            qr_png=qr_png,
            qr_size_cm=2.0,
            qr_page=0,
            qr_rect=qr_rect,
        )
        
        doc = fitz.open(stream=result, filetype="pdf")
        images = doc[0].get_images()
        doc.close()
        
        print(f"OUTPUT:")
        print(f"  PDF size:    {len(result):,} bytes")
        print(f"  Images:      {len(images)} (QR inserted)")
        print(f"  Position:    Custom rect {qr_rect}")
        print("=" * 70)
        
        assert len(images) >= 1

    def test_insert_qr_portrait_auto(self, portrait_pdf: bytes, qr_png: bytes) -> None:
        """Test QR insertion in portrait PDF with auto-placement (bottom-right)."""
        service = PdfQrInsertService()
        
        qr_size_cm = 2.5
        
        print("\n" + "=" * 70)
        print("TEST: QR Insert - Portrait PDF Auto-placement")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:    {len(portrait_pdf):,} bytes (portrait 612x792)")
        print(f"  QR PNG:      {len(qr_png):,} bytes")
        print(f"  QR size:     {qr_size_cm} cm")
        print(f"  QR rect:     None (auto: bottom-right)")
        print("-" * 70)
        
        result = service.insert_qr_bytes(
            input_pdf=portrait_pdf,
            qr_png=qr_png,
            qr_size_cm=qr_size_cm,
            qr_page=0,
            # No qr_rect - should auto-place bottom-right
        )
        
        doc = fitz.open(stream=result, filetype="pdf")
        images = doc[0].get_images()
        doc.close()
        
        print(f"OUTPUT:")
        print(f"  PDF size:    {len(result):,} bytes")
        print(f"  Images:      {len(images)} (QR inserted)")
        print(f"  Position:    Bottom-right (auto)")
        print("=" * 70)
        
        assert len(result) > len(portrait_pdf)
        assert len(images) >= 1

    def test_insert_qr_multi_page(self, qr_png: bytes) -> None:
        """Test QR insertion on specific page of multi-page PDF."""
        service = PdfQrInsertService()
        
        # Create 3-page PDF
        doc = fitz.open()
        for i in range(3):
            page = doc.new_page(width=792, height=612)
            page.insert_text((100, 100), f"Page {i + 1}", fontsize=14)
        pdf_bytes = doc.write()
        doc.close()
        
        target_page = 2  # Last page (0-indexed)
        
        print("\n" + "=" * 70)
        print("TEST: QR Insert - Multi-page PDF")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:    {len(pdf_bytes):,} bytes (3 pages)")
        print(f"  QR PNG:      {len(qr_png):,} bytes")
        print(f"  Target page: {target_page} (third page)")
        print("-" * 70)
        
        result = service.insert_qr_bytes(
            input_pdf=pdf_bytes,
            qr_png=qr_png,
            qr_size_cm=2.0,
            qr_page=target_page,
        )
        
        doc = fitz.open(stream=result, filetype="pdf")
        images_page0 = doc[0].get_images()
        images_page2 = doc[2].get_images()
        doc.close()
        
        print(f"OUTPUT:")
        print(f"  PDF size:    {len(result):,} bytes")
        print(f"  Page 0:      {len(images_page0)} images")
        print(f"  Page 2:      {len(images_page2)} images (QR here)")
        print("=" * 70)
        
        assert len(images_page2) >= 1
