from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Optional
from urllib.request import urlopen

import segno
from PIL import Image


@dataclass(frozen=True)
class QrService:
    """
    SRP: Generates QR codes (PNG bytes) for a verification URL.
    Supports optional logo from:
      - local logo_path
      - cached logo_cache_path
      - remote logo_url (downloaded & cached)
    """

    logo_path: Optional[Path] = None
    logo_url: Optional[str] = None
    logo_cache_path: Optional[Path] = None

    def _download_logo(self) -> Optional[bytes]:
        if not self.logo_url:
            return None
        try:
            with urlopen(self.logo_url, timeout=5) as resp:
                return resp.read()
        except Exception:
            return None

    def _load_logo_image(self) -> Optional[Image.Image]:
        # 1) local file
        if self.logo_path and self.logo_path.exists():
            try:
                return Image.open(self.logo_path).convert("RGBA")
            except Exception:
                return None

        # 2) cached file
        if self.logo_cache_path and self.logo_cache_path.exists():
            try:
                return Image.open(self.logo_cache_path).convert("RGBA")
            except Exception:
                return None

        # 3) download from URL and cache
        logo_bytes = self._download_logo()
        if not logo_bytes:
            return None

        try:
            img = Image.open(BytesIO(logo_bytes)).convert("RGBA")
        except Exception:
            return None

        if self.logo_cache_path:
            try:
                self.logo_cache_path.parent.mkdir(parents=True, exist_ok=True)
                self.logo_cache_path.write_bytes(logo_bytes)
            except Exception:
                pass

        return img

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
        base_url = (base_url or "").strip()
        verify_code = (verify_code or "").strip()

        if not base_url:
            raise ValueError("base_url is required")
        if not verify_code:
            raise ValueError("verify_code is required")

        target = f"{base_url}?verify_code={verify_code}"

        qr = segno.make(target, error="h")

        qr_buf = BytesIO()
        qr.save(qr_buf, kind="png", scale=scale, border=border, dark="black", light="white")
        qr_buf.seek(0)

        qr_img = Image.open(qr_buf).convert("RGBA")

        logo_img = self._load_logo_image()
        if logo_img is None:
            out = BytesIO()
            qr_img.save(out, format="PNG")
            return out.getvalue()

        qr_w, qr_h = qr_img.size
        max_logo = max(1, int(qr_w * float(logo_ratio)))
        logo_img.thumbnail((max_logo, max_logo), Image.Resampling.LANCZOS)

        back_w = logo_img.size[0] + logo_padding * 2
        back_h = logo_img.size[1] + logo_padding * 2
        backplate = Image.new("RGBA", (back_w, back_h), (255, 255, 255, 255))
        backplate.paste(logo_img, (logo_padding, logo_padding), mask=logo_img)

        x = (qr_w - back_w) // 2
        y = (qr_h - back_h) // 2
        final_img = qr_img.copy()
        final_img.alpha_composite(backplate, (x, y))

        out = BytesIO()
        final_img.save(out, format="PNG")
        return out.getvalue()
