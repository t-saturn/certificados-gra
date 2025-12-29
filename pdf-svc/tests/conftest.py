"""
Pytest fixtures and configuration.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import uuid4

import fitz
import pytest


# =============================================================================
# PDF Fixtures
# =============================================================================


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_pdf_with_placeholders() -> bytes:
    """Create a sample PDF with placeholders for testing."""
    doc = fitz.open()
    page = doc.new_page(width=792, height=612)  # Landscape

    # Add text with placeholders
    page.insert_text((100, 100), "Certificate of Completion", fontsize=24)
    page.insert_text((100, 200), "This certifies that {{nombre_participante}}", fontsize=14)
    page.insert_text((100, 250), "has completed the course on {{fecha}}", fontsize=14)
    page.insert_text((100, 300), "Course: {{curso}}", fontsize=12)

    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


@pytest.fixture
def sample_landscape_pdf() -> bytes:
    """Create a simple landscape PDF."""
    doc = fitz.open()
    page = doc.new_page(width=792, height=612)  # Landscape
    page.insert_text((100, 100), "Test Document - Landscape", fontsize=12)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


@pytest.fixture
def sample_portrait_pdf() -> bytes:
    """Create a simple portrait PDF."""
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # Portrait
    page.insert_text((100, 100), "Test Document - Portrait", fontsize=12)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


# =============================================================================
# QR Fixtures
# =============================================================================


@pytest.fixture
def qr_config() -> list[dict[str, str]]:
    """Sample QR configuration."""
    return [
        {"base_url": "https://example.com/verify"},
        {"verify_code": "TEST-2025-001"},
    ]


@pytest.fixture
def qr_pdf_config() -> list[dict[str, str]]:
    """Sample QR PDF insertion configuration."""
    return [
        {"qr_size_cm": "2.5"},
        {"qr_margin_y_cm": "1.0"},
        {"qr_page": "0"},
    ]


@pytest.fixture
def qr_pdf_config_with_rect() -> list[dict[str, str]]:
    """Sample QR PDF configuration with explicit rect."""
    return [
        {"qr_size_cm": "2.0"},
        {"qr_page": "0"},
        {"qr_rect": "460,40,540,120"},
    ]


# =============================================================================
# PDF Items Fixtures
# =============================================================================


@pytest.fixture
def pdf_items() -> list[dict[str, str]]:
    """Sample PDF placeholder items."""
    return [
        {"key": "nombre_participante", "value": "MARÍA LUQUE RIVERA"},
        {"key": "fecha", "value": "28/12/2024"},
        {"key": "curso", "value": "Python Avanzado"},
    ]


# =============================================================================
# Batch Fixtures
# =============================================================================


@pytest.fixture
def batch_item_data() -> dict:
    """Sample batch item data."""
    return {
        "user_id": str(uuid4()),
        "template_id": str(uuid4()),
        "serial_code": "CERT-2025-000001",
        "is_public": True,
        "pdf": [
            {"key": "nombre_participante", "value": "Juan Pérez"},
            {"key": "fecha", "value": "28/12/2024"},
        ],
        "qr": [
            {"base_url": "https://example.com/verify"},
            {"verify_code": "CERT-2025-000001"},
        ],
        "qr_pdf": [
            {"qr_size_cm": "2.5"},
            {"qr_margin_y_cm": "1.0"},
            {"qr_page": "0"},
        ],
    }


@pytest.fixture
def batch_request_data(batch_item_data: dict) -> dict:
    """Sample batch request data."""
    return {
        "project_id": str(uuid4()),
        "items": [
            batch_item_data,
            {
                **batch_item_data,
                "serial_code": "CERT-2025-000002",
                "pdf": [
                    {"key": "nombre_participante", "value": "María García"},
                    {"key": "fecha", "value": "28/12/2024"},
                ],
                "qr": [
                    {"base_url": "https://example.com/verify"},
                    {"verify_code": "CERT-2025-000002"},
                ],
            },
        ],
    }
