"""
QR Code generation service.
SRP: Generates QR codes (PNG bytes) for verification URLs.
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

import segno
from PIL import Image

from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


class QrService:
    """
    QR code generation service.

    Supports optional logo from:
      - local logo_path
      - cached logo_cache_path
      - remote logo_url (downloaded & cached)
    """

    def __init__(
        self,
        logo_path: str | None = None,
        logo_url: str | None = None,
        logo_cache_path: str | None = None,
    ) -> None:
        """
        Initialize QR service.

        Args:
            logo_path: Local path to logo file
            logo_url: URL to download logo from
            logo_cache_path: Path to cache downloaded logo
        """
        self.logo_path = Path(logo_path) if logo_path else None
        self.logo_url = logo_url
        self.logo_cache_path = Path(logo_cache_path) if logo_cache_path else None

    def _download_logo(self) -> bytes | None:
        """Download logo from URL."""
        if not self.logo_url:
            return None
        try:
            logger.debug("downloading_logo", url=self.logo_url)
            with urlopen(self.logo_url, timeout=10) as resp:
                data = resp.read()
                logger.debug("logo_downloaded", size_bytes=len(data))
                return data
        except Exception as e:
            logger.warning("logo_download_failed", url=self.logo_url, error=str(e))
            return None

    def _load_logo_image(self) -> Image.Image | None:
        """Load logo image from various sources."""
        # 1) Local file
        if self.logo_path and self.logo_path.exists():
            try:
                logger.debug("loading_logo_from_path", path=str(self.logo_path))
                return Image.open(self.logo_path).convert("RGBA")
            except Exception as e:
                logger.warning("logo_load_failed", path=str(self.logo_path), error=str(e))
                return None

        # 2) Cached file
        if self.logo_cache_path and self.logo_cache_path.exists():
            try:
                logger.debug("loading_logo_from_cache", path=str(self.logo_cache_path))
                return Image.open(self.logo_cache_path).convert("RGBA")
            except Exception as e:
                logger.warning("cache_load_failed", path=str(self.logo_cache_path), error=str(e))
                return None

        # 3) Download from URL and cache
        logo_bytes = self._download_logo()
        if not logo_bytes:
            return None

        try:
            img = Image.open(BytesIO(logo_bytes)).convert("RGBA")
        except Exception as e:
            logger.warning("logo_parse_failed", error=str(e))
            return None

        # Cache the downloaded logo
        if self.logo_cache_path:
            try:
                self.logo_cache_path.parent.mkdir(parents=True, exist_ok=True)
                self.logo_cache_path.write_bytes(logo_bytes)
                logger.debug("logo_cached", path=str(self.logo_cache_path))
            except Exception as e:
                logger.warning("logo_cache_write_failed", error=str(e))

        return img

    def _build_url(self, base_url: str, verify_code: str) -> str:
        """Build the verification URL for QR content."""
        return f"{base_url}?code={verify_code}"

    def generate_png(
        self,
        *,
        base_url: str,
        verify_code: str,
        scale: int = 20,
        border: int = 4,
        logo_ratio: float = 0.25,
        logo_padding: int = 10,
    ) -> bytes:
        """
        Generate QR code PNG with optional logo overlay.

        Args:
            base_url: Base URL for verification
            verify_code: Verification code to append
            scale: QR code scale factor
            border: Border size in modules
            logo_ratio: Logo size relative to QR (0.0-1.0)
            logo_padding: Padding around logo in pixels

        Returns:
            PNG image bytes

        Raises:
            ValueError: If base_url or verify_code is empty
        """
        base_url = (base_url or "").strip()
        verify_code = (verify_code or "").strip()

        if not base_url:
            raise ValueError("base_url is required")
        if not verify_code:
            raise ValueError("verify_code is required")

        target = self._build_url(base_url, verify_code)
        logger.debug("generating_qr", target_url=target)

        # Generate QR code with high error correction (for logo overlay)
        qr = segno.make(target, error="h")

        qr_buf = BytesIO()
        qr.save(qr_buf, kind="png", scale=scale, border=border, dark="black", light="white")
        qr_buf.seek(0)

        qr_img = Image.open(qr_buf).convert("RGBA")

        # Try to load logo
        logo_img = self._load_logo_image()
        if logo_img is None:
            logger.debug("qr_generated_without_logo")
            out = BytesIO()
            qr_img.save(out, format="PNG")
            return out.getvalue()

        # Calculate logo size
        qr_w, qr_h = qr_img.size
        max_logo = max(1, int(qr_w * float(logo_ratio)))
        logo_img.thumbnail((max_logo, max_logo), Image.Resampling.LANCZOS)

        # Create white backplate for logo
        back_w = logo_img.size[0] + logo_padding * 2
        back_h = logo_img.size[1] + logo_padding * 2
        backplate = Image.new("RGBA", (back_w, back_h), (255, 255, 255, 255))
        backplate.paste(logo_img, (logo_padding, logo_padding), mask=logo_img)

        # Center logo on QR code
        x = (qr_w - back_w) // 2
        y = (qr_h - back_h) // 2
        final_img = qr_img.copy()
        final_img.alpha_composite(backplate, (x, y))

        logger.debug("qr_generated_with_logo", qr_size=(qr_w, qr_h), logo_size=logo_img.size)

        out = BytesIO()
        final_img.save(out, format="PNG")
        return out.getvalue()

    async def generate_png_async(
        self,
        *,
        base_url: str,
        verify_code: str,
        scale: int = 20,
        border: int = 4,
        logo_ratio: float = 0.25,
        logo_padding: int = 10,
    ) -> bytes:
        """Async wrapper for generate_png (CPU-bound operation)."""
        import asyncio

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.generate_png(
                base_url=base_url,
                verify_code=verify_code,
                scale=scale,
                border=border,
                logo_ratio=logo_ratio,
                logo_padding=logo_padding,
            ),
        )
