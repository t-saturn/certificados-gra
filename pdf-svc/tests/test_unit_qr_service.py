"""
Unit tests for QrService.

Tests QR code generation functionality.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from pdf_svc.services.qr_service import QrService


class TestQrService:
    """Unit tests for QR code generation service."""

    @pytest.fixture
    def service(self) -> QrService:
        """Create QR service without logo."""
        return QrService()

    @pytest.fixture
    def service_with_logo(self, temp_dir: Path) -> QrService:
        """Create QR service with a test logo."""
        # Create a simple test logo
        from PIL import Image

        logo_path = temp_dir / "logo.png"
        img = Image.new("RGBA", (50, 50), color=(255, 0, 0, 255))
        img.save(logo_path)

        return QrService(logo_path=str(logo_path))

    # -- Basic Generation Tests
    @pytest.mark.unit
    def test_generate_png_basic(self, service: QrService) -> None:
        """Test basic QR code generation."""
        result = service.generate_png(
            base_url="https://example.com/verify",
            verify_code="TEST-001",
        )

        assert result is not None
        assert len(result) > 0
        # PNG magic bytes
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    @pytest.mark.unit
    def test_generate_png_with_scale(self, service: QrService) -> None:
        """Test QR generation with custom scale."""
        small = service.generate_png(
            base_url="https://example.com",
            verify_code="TEST",
            scale=5,
        )

        large = service.generate_png(
            base_url="https://example.com",
            verify_code="TEST",
            scale=15,
        )

        # Larger scale should produce larger file
        assert len(large) > len(small)

    @pytest.mark.unit
    def test_generate_png_with_logo(self, service_with_logo: QrService) -> None:
        """Test QR generation with logo overlay."""
        result = service_with_logo.generate_png(
            base_url="https://example.com/verify",
            verify_code="TEST-LOGO-001",
        )

        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    @pytest.mark.unit
    async def test_generate_png_async(self, service: QrService) -> None:
        """Test async QR generation."""
        result = await service.generate_png_async(
            base_url="https://example.com/verify",
            verify_code="TEST-ASYNC-001",
        )

        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    # -- Validation Tests
    @pytest.mark.unit
    def test_generate_png_empty_base_url(self, service: QrService) -> None:
        """Test with empty base_url."""
        with pytest.raises(ValueError, match="base_url"):
            service.generate_png(
                base_url="",
                verify_code="TEST-001",
            )

    @pytest.mark.unit
    def test_generate_png_empty_verify_code(self, service: QrService) -> None:
        """Test with empty verify_code."""
        with pytest.raises(ValueError, match="verify_code"):
            service.generate_png(
                base_url="https://example.com",
                verify_code="",
            )

    @pytest.mark.unit
    def test_generate_png_whitespace_only(self, service: QrService) -> None:
        """Test with whitespace-only inputs."""
        with pytest.raises(ValueError):
            service.generate_png(
                base_url="   ",
                verify_code="   ",
            )

    # -- URL Building Tests
    @pytest.mark.unit
    def test_build_qr_url(self, service: QrService) -> None:
        """Test URL building for QR content."""
        url = service._build_url(
            base_url="https://example.com/verify",
            verify_code="TEST-001",
        )

        assert url == "https://example.com/verify?code=TEST-001"

    @pytest.mark.unit
    def test_build_qr_url_with_trailing_slash(self, service: QrService) -> None:
        """Test URL building with trailing slash."""
        url = service._build_url(
            base_url="https://example.com/verify/",
            verify_code="TEST-001",
        )

        assert url == "https://example.com/verify/?code=TEST-001"

    # -- Special Characters Tests
    @pytest.mark.unit
    def test_generate_png_special_characters(self, service: QrService) -> None:
        """Test QR with special characters in verify code."""
        result = service.generate_png(
            base_url="https://example.com/verify",
            verify_code="CERT-2025-ÑOÑO-001",
        )

        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    @pytest.mark.unit
    def test_generate_png_long_url(self, service: QrService) -> None:
        """Test QR with long URL content."""
        result = service.generate_png(
            base_url="https://subdomain.example.com/api/v1/certificates/verify",
            verify_code="CERT-2025-ORGANIZATION-DEPARTMENT-000001",
        )

        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"

    # -- Logo Handling Tests
    @pytest.mark.unit
    def test_logo_not_found_fallback(self, temp_dir: Path) -> None:
        """Test that missing logo falls back to QR without logo."""
        service = QrService(logo_path=str(temp_dir / "nonexistent.png"))

        result = service.generate_png(
            base_url="https://example.com",
            verify_code="TEST-001",
        )

        assert result is not None
        assert result[:8] == b"\x89PNG\r\n\x1a\n"
