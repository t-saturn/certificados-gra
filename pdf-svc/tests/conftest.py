"""
Pytest configuration and fixtures.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import AsyncIterator, Iterator
from unittest.mock import MagicMock, AsyncMock

import pytest
from faker import Faker

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Set test environment variables before importing settings
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("LOG_LEVEL", "debug")


fake = Faker()


@pytest.fixture
def temp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory for tests."""
    return tmp_path


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Create minimal valid PDF bytes for testing."""
    # Minimal valid PDF structure
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
({{nombre_participante}}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""


@pytest.fixture
def sample_png_bytes() -> bytes:
    """Create minimal valid PNG bytes for testing."""
    # 1x1 white PNG
    return bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
        0x44, 0xAE, 0x42, 0x60, 0x82,
    ])


@pytest.fixture
def pdf_items() -> list[dict[str, str]]:
    """Sample PDF placeholder items."""
    return [
        {"key": "nombre_participante", "value": "JUAN PÉREZ GARCÍA"},
        {"key": "fecha", "value": "28/12/2024"},
        {"key": "firma_1_nombre", "value": "Dr. Carlos Mendoza"},
        {"key": "firma_1_cargo", "value": "Director General"},
    ]


@pytest.fixture
def qr_config() -> dict[str, str]:
    """Sample QR configuration."""
    return {
        "base_url": "https://example.com/verify",
        "verify_code": "CERT-2024-001234",
    }


@pytest.fixture
def qr_pdf_config() -> dict[str, str]:
    """Sample QR PDF insertion configuration."""
    return {
        "qr_size_cm": "2.5",
        "qr_margin_y_cm": "1.0",
        "qr_margin_x_cm": "1.0",
        "qr_page": "0",
        "qr_rect": "460,40,540,120",
    }


@pytest.fixture
def mock_redis() -> MagicMock:
    """Create mock Redis client."""
    mock = MagicMock()
    mock.ping = AsyncMock(return_value=True)
    mock.get = AsyncMock(return_value=None)
    mock.setex = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.exists = AsyncMock(return_value=0)
    return mock


@pytest.fixture
def mock_nats() -> MagicMock:
    """Create mock NATS client."""
    mock = MagicMock()
    mock.publish = AsyncMock(return_value=None)
    mock.subscribe = AsyncMock(return_value=MagicMock())
    mock.is_connected = True
    return mock
