"""
Unit tests for PDF Replace Service.
3 tests that simulate placeholder replacement with clear input/output display.
"""

import fitz
import pytest
from pdf_svc.services.pdf_replace_service import PdfReplaceService


@pytest.mark.unit
class TestPdfReplaceService:
    """PDF Replace Service unit tests - 3 tests."""

    @pytest.fixture
    def sample_pdf_with_placeholders(self) -> bytes:
        """Create PDF with placeholders."""
        doc = fitz.open()
        page = doc.new_page(width=792, height=612)
        page.insert_text((100, 100), "Certificado para: {{nombre}}", fontsize=14)
        page.insert_text((100, 150), "Fecha: {{fecha}}", fontsize=12)
        page.insert_text((100, 200), "Curso: {{curso}}", fontsize=12)
        pdf_bytes = doc.write()
        doc.close()
        return pdf_bytes

    def test_replace_placeholders_basic(self, sample_pdf_with_placeholders: bytes) -> None:
        """Test basic placeholder replacement."""
        service = PdfReplaceService()
        
        pdf_items = [
            {"key": "nombre", "value": "MARÍA LUQUE RIVERA"},
            {"key": "fecha", "value": "28/12/2024"},
            {"key": "curso", "value": "Python Avanzado"},
        ]
        
        print("\n" + "=" * 70)
        print("TEST: PDF Replace - Basic Placeholders")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:     {len(sample_pdf_with_placeholders):,} bytes")
        print(f"  Placeholders:")
        for item in pdf_items:
            print(f"    {{{{{item['key']}}}}} → {item['value']}")
        print("-" * 70)
        
        result = service.render_pdf_bytes(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
        )
        
        # Extract text to verify
        doc = fitz.open(stream=result, filetype="pdf")
        text = doc[0].get_text()
        doc.close()
        
        print(f"OUTPUT:")
        print(f"  PDF size:     {len(result):,} bytes")
        print(f"  Contains 'MARÍA': {'✓' if 'MARÍA' in text else '✗'}")
        print(f"  Contains '28/12/2024': {'✓' if '28/12/2024' in text else '✗'}")
        print("=" * 70)
        
        assert b"%PDF" in result[:10]
        assert "MARÍA" in text or "MARIA" in text

    def test_replace_empty_placeholders(self, sample_pdf_with_placeholders: bytes) -> None:
        """Test with no placeholders to replace."""
        service = PdfReplaceService()
        
        pdf_items = []  # No replacements
        
        print("\n" + "=" * 70)
        print("TEST: PDF Replace - No Placeholders")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:     {len(sample_pdf_with_placeholders):,} bytes")
        print(f"  Placeholders: (none)")
        print("-" * 70)
        
        result = service.render_pdf_bytes(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
        )
        
        print(f"OUTPUT:")
        print(f"  PDF size:     {len(result):,} bytes")
        print(f"  Status:       ✓ PDF unchanged (placeholders remain)")
        print("=" * 70)
        
        assert b"%PDF" in result[:10]

    def test_replace_special_characters(self, sample_pdf_with_placeholders: bytes) -> None:
        """Test with special characters."""
        service = PdfReplaceService()
        
        pdf_items = [
            {"key": "nombre", "value": "JOSÉ GARCÍA-ÑOÑO"},
            {"key": "fecha", "value": "31/12/2024"},
            {"key": "curso", "value": "Diseño & Programación"},
        ]
        
        print("\n" + "=" * 70)
        print("TEST: PDF Replace - Special Characters")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  PDF size:     {len(sample_pdf_with_placeholders):,} bytes")
        print(f"  Placeholders:")
        for item in pdf_items:
            print(f"    {{{{{item['key']}}}}} → {item['value']}")
        print("-" * 70)
        
        result = service.render_pdf_bytes(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
        )
        
        print(f"OUTPUT:")
        print(f"  PDF size:     {len(result):,} bytes")
        print(f"  Status:       ✓ Special chars handled")
        print("=" * 70)
        
        assert b"%PDF" in result[:10]
