"""
Tests for QrService.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from pdf_svc.services.qr_service import QrService


class TestQrService:
    """Tests for QR code generation service."""

    @pytest.fixture
    def qr_service(self) -> QrService:
        """Create QR service without logo."""
        return QrService()

    @pytest.fixture
    def qr_service_with_logo(self, tmp_path: Path, sample_png_bytes: bytes) -> QrService:
        """Create QR service with local logo."""
        logo_path = tmp_path / "logo.png"
        logo_path.write_bytes(sample_png_bytes)
        return QrService(logo_path=logo_path)

    @pytest.mark.unit
    def test_generate_png_basic(self, qr_service: QrService) -> None:
        """Test basic QR generation without logo."""
        result = qr_service.generate_png(
            base_url="https://example.com/verify",
            verify_code="TEST-001",
        )

        assert result is not None
        assert len(result) > 0
        # PNG signature
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    @pytest.mark.unit
    def test_generate_png_with_logo(self, qr_service_with_logo: QrService) -> None:
        """Test QR generation with logo overlay."""
        result = qr_service_with_logo.generate_png(
            base_url="https://example.com/verify",
            verify_code="TEST-002",
        )

        assert result is not None
        assert len(result) > 0
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    @pytest.mark.unit
    def test_generate_png_empty_base_url(self, qr_service: QrService) -> None:
        """Test that empty base_url raises ValueError."""
        with pytest.raises(ValueError, match="base_url is required"):
            qr_service.generate_png(base_url="", verify_code="TEST-001")

    @pytest.mark.unit
    def test_generate_png_empty_verify_code(self, qr_service: QrService) -> None:
        """Test that empty verify_code raises ValueError."""
        with pytest.raises(ValueError, match="verify_code is required"):
            qr_service.generate_png(base_url="https://example.com", verify_code="")

    @pytest.mark.unit
    def test_generate_png_whitespace_only(self, qr_service: QrService) -> None:
        """Test that whitespace-only values raise ValueError."""
        with pytest.raises(ValueError, match="base_url is required"):
            qr_service.generate_png(base_url="   ", verify_code="TEST")

    @pytest.mark.unit
    def test_generate_png_custom_scale(self, qr_service: QrService) -> None:
        """Test QR generation with custom scale."""
        small = qr_service.generate_png(
            base_url="https://example.com",
            verify_code="TEST",
            scale=5,
        )

        large = qr_service.generate_png(
            base_url="https://example.com",
            verify_code="TEST",
            scale=20,
        )

        # Larger scale should produce larger image
        assert len(large) > len(small)

    @pytest.mark.unit
    async def test_generate_png_async(self, qr_service: QrService) -> None:
        """Test async QR generation."""
        result = await qr_service.generate_png_async(
            base_url="https://example.com/verify",
            verify_code="ASYNC-TEST-001",
        )

        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    @pytest.mark.unit
    def test_generate_png_special_characters(self, qr_service: QrService) -> None:
        """Test QR with special characters in verify_code."""
        result = qr_service.generate_png(
            base_url="https://example.com/verify",
            verify_code="CERT-ÑOÑO-2024-ÁÉÍ",
        )

        assert result is not None
        assert len(result) > 0

    @pytest.mark.unit
    def test_logo_not_found_fallback(self, tmp_path: Path) -> None:
        """Test fallback when logo file doesn't exist."""
        service = QrService(logo_path=tmp_path / "nonexistent.png")

        result = service.generate_png(
            base_url="https://example.com",
            verify_code="TEST",
        )

        # Should still generate QR without logo
        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"
