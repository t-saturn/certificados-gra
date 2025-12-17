from pathlib import Path

import pytest
from PIL import Image

from app.services.qr_service import QrService


def test_generate_png_returns_png_bytes(tmp_path: Path):
    # Create temp logo
    logo_path = tmp_path / "logo.png"
    Image.new("RGBA", (80, 80), (255, 0, 0, 255)).save(logo_path, format="PNG")

    svc = QrService(logo_path=logo_path)
    out = svc.generate_png(
        base_url="https://regionayacucho.gob.pe/verify",
        verify_code="CERT-2025-ABCD",
    )

    assert isinstance(out, (bytes, bytearray))
    # PNG signature
    assert out[:8] == b"\x89PNG\r\n\x1a\n"


def test_generate_png_without_logo_still_returns_png(tmp_path: Path):
    missing_logo = tmp_path / "missing.png"
    svc = QrService(logo_path=missing_logo)

    out = svc.generate_png(
        base_url="https://regionayacucho.gob.pe/verify",
        verify_code="CERT-2025-ABCD",
    )

    assert out[:8] == b"\x89PNG\r\n\x1a\n"


@pytest.mark.parametrize(
    "base_url,verify_code,expected",
    [
        ("", "X", "base_url is required"),
        ("https://regionayacucho.gob.pe/verify", "", "verify_code is required"),
    ],
)
def test_generate_png_validations(tmp_path: Path, base_url: str, verify_code: str, expected: str):
    svc = QrService(logo_path=tmp_path / "logo.png")
    with pytest.raises(ValueError) as e:
        svc.generate_png(base_url=base_url, verify_code=verify_code)
    assert str(e.value) == expected
