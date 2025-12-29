"""
Unit tests for PdfReplaceService.

Tests placeholder replacement in PDF documents.
"""

from __future__ import annotations

import pytest

from pdf_svc.services.pdf_replace_service import PdfReplaceService


class TestPdfReplaceService:
    """Unit tests for PDF text replacement service."""

    @pytest.fixture
    def service(self) -> PdfReplaceService:
        """Create PDF replace service."""
        return PdfReplaceService()

    # -------------------------------------------------------------------------
    # Placeholder Formatting Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_format_placeholders_basic(self, service: PdfReplaceService) -> None:
        """Test basic placeholder formatting."""
        items = [
            {"key": "nombre", "value": "Juan"},
            {"key": "fecha", "value": "2024-12-28"},
        ]

        result = service.format_placeholders(items)

        assert result == {
            "{{nombre}}": "Juan",
            "{{fecha}}": "2024-12-28",
        }

    @pytest.mark.unit
    def test_format_placeholders_with_whitespace(self, service: PdfReplaceService) -> None:
        """Test placeholder formatting with whitespace."""
        items = [
            {"key": "  nombre  ", "value": "  Juan  "},
        ]

        result = service.format_placeholders(items)

        assert result == {"{{nombre}}": "Juan"}

    @pytest.mark.unit
    def test_format_placeholders_empty_key(self, service: PdfReplaceService) -> None:
        """Test that empty keys are ignored."""
        items = [
            {"key": "", "value": "ignored"},
            {"key": "valid", "value": "value"},
        ]

        result = service.format_placeholders(items)

        assert result == {"{{valid}}": "value"}

    @pytest.mark.unit
    def test_format_placeholders_empty_list(self, service: PdfReplaceService) -> None:
        """Test with empty list."""
        result = service.format_placeholders([])
        assert result == {}

    @pytest.mark.unit
    def test_format_placeholders_special_characters(self, service: PdfReplaceService) -> None:
        """Test placeholders with special characters in values."""
        items = [
            {"key": "nombre", "value": "María José García-Ñoño"},
            {"key": "cargo", "value": "Director & CEO"},
        ]

        result = service.format_placeholders(items)

        assert result["{{nombre}}"] == "María José García-Ñoño"
        assert result["{{cargo}}"] == "Director & CEO"

    # -------------------------------------------------------------------------
    # PDF Rendering Tests
    # -------------------------------------------------------------------------

    @pytest.mark.unit
    def test_render_pdf_bytes_basic(
        self, service: PdfReplaceService, sample_pdf_with_placeholders: bytes, pdf_items: list
    ) -> None:
        """Test basic PDF rendering with placeholders."""
        result = service.render_pdf_bytes(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.unit
    def test_render_pdf_bytes_empty_items(
        self, service: PdfReplaceService, sample_pdf_with_placeholders: bytes
    ) -> None:
        """Test rendering with no items (should return valid PDF)."""
        result = service.render_pdf_bytes(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=[],
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.unit
    def test_render_pdf_bytes_invalid_pdf(self, service: PdfReplaceService) -> None:
        """Test with invalid PDF bytes."""
        with pytest.raises(Exception):
            service.render_pdf_bytes(
                template_pdf=b"not a valid pdf",
                pdf_items=[{"key": "test", "value": "value"}],
            )

    @pytest.mark.unit
    async def test_render_pdf_bytes_async(
        self, service: PdfReplaceService, sample_pdf_with_placeholders: bytes, pdf_items: list
    ) -> None:
        """Test async PDF rendering."""
        result = await service.render_pdf_bytes_async(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
        )

        assert result is not None
        assert result[:4] == b"%PDF"

    @pytest.mark.unit
    def test_render_pdf_preserves_dimensions(
        self, service: PdfReplaceService, sample_pdf_with_placeholders: bytes, pdf_items: list
    ) -> None:
        """Test that rendering preserves PDF dimensions."""
        import fitz

        # Get original dimensions
        original_doc = fitz.open(stream=sample_pdf_with_placeholders, filetype="pdf")
        original_rect = original_doc[0].rect
        original_doc.close()

        # Render
        result = service.render_pdf_bytes(
            template_pdf=sample_pdf_with_placeholders,
            pdf_items=pdf_items,
        )

        # Check dimensions
        result_doc = fitz.open(stream=result, filetype="pdf")
        result_rect = result_doc[0].rect
        result_doc.close()

        assert result_rect.width == original_rect.width
        assert result_rect.height == original_rect.height
