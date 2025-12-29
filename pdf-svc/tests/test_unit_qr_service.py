"""
Unit tests for QR Service.
3 tests that simulate QR generation with clear input/output display.
"""

import pytest
from pdf_svc.services.qr_service import QrService


@pytest.mark.unit
class TestQrService:
    """QR Service unit tests - 3 tests."""

    def test_generate_qr_basic(self) -> None:
        """Test basic QR generation."""
        service = QrService()
        
        # Input
        base_url = "https://verify.example.com"
        verify_code = "CERT-2025-000001"
        
        print("\n" + "=" * 70)
        print("TEST: QR Generation - Basic")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  base_url:    {base_url}")
        print(f"  verify_code: {verify_code}")
        print("-" * 70)
        
        # Process (kwargs required)
        qr_png = service.generate_png(base_url=base_url, verify_code=verify_code)
        
        # Output
        print(f"OUTPUT:")
        print(f"  PNG size:    {len(qr_png)} bytes")
        print(f"  PNG header:  {qr_png[:8].hex()} (PNG signature)")
        print(f"  QR URL:      {base_url}?code={verify_code}")
        print("=" * 70)
        
        assert qr_png[:8] == b'\x89PNG\r\n\x1a\n'
        assert len(qr_png) > 100

    def test_generate_qr_with_scale(self) -> None:
        """Test QR with custom scale."""
        service = QrService()
        
        base_url = "https://verify.example.com"
        verify_code = "CERT-2025-000002"
        scale = 15
        
        print("\n" + "=" * 70)
        print("TEST: QR Generation - Custom Scale")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  base_url:    {base_url}")
        print(f"  verify_code: {verify_code}")
        print(f"  scale:       {scale}")
        print("-" * 70)
        
        qr_small = service.generate_png(base_url=base_url, verify_code=verify_code, scale=5)
        qr_large = service.generate_png(base_url=base_url, verify_code=verify_code, scale=scale)
        
        print(f"OUTPUT:")
        print(f"  Small (scale=5):  {len(qr_small):,} bytes")
        print(f"  Large (scale=15): {len(qr_large):,} bytes")
        print(f"  Size ratio:       {len(qr_large)/len(qr_small):.1f}x")
        print("=" * 70)
        
        assert len(qr_large) > len(qr_small)

    def test_generate_qr_special_characters(self) -> None:
        """Test QR with special characters."""
        service = QrService()
        
        base_url = "https://verify.example.com"
        verify_code = "CERT-ÑOÑO-2025-001"
        
        print("\n" + "=" * 70)
        print("TEST: QR Generation - Special Characters")
        print("=" * 70)
        print(f"INPUT:")
        print(f"  base_url:    {base_url}")
        print(f"  verify_code: {verify_code}")
        print(f"  Full URL:    {base_url}?code={verify_code}")
        print("-" * 70)
        
        qr_png = service.generate_png(base_url=base_url, verify_code=verify_code)
        
        print(f"OUTPUT:")
        print(f"  PNG size:    {len(qr_png)} bytes")
        print(f"  Status:      ✓ Generated successfully")
        print("=" * 70)
        
        assert qr_png[:8] == b'\x89PNG\r\n\x1a\n'
