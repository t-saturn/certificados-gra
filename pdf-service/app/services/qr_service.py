from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import segno
from PIL import Image


@dataclass(frozen=True)
class QrService:
    """
    SRP: Generate QR codes as PNG bytes (optionally embedding a logo).
    """
    logo_path: Path

    def generate_png(
        self,
        *,
        base_url: str,
        verify_code: str,
        scale: int = 20,
        border: int = 4,
        logo_ratio: float = 0.25,   # logo max width as % of QR width
        logo_padding: int = 10,     # white padding around logo
    ) -> bytes:
        base_url = (base_url or "").strip()
        verify_code = (verify_code or "").strip()

        if not base_url:
            raise ValueError("base_url is required")
        if not verify_code:
            raise ValueError("verify_code is required")

        target = f"{base_url}?verify_code={verify_code}"

        # Highest error correction: better chance QR remains scannable with logo
        qr = segno.make(target, error="h")

        # 1) Render QR to PNG in memory
        qr_buf = BytesIO()
        qr.save(
            qr_buf,
            kind="png",
            scale=scale,
            border=border,
            dark="black",
            light="white",
        )
        qr_buf.seek(0)
        qr_img = Image.open(qr_buf).convert("RGBA")

        # 2) If logo missing -> return QR alone
        if not self.logo_path.exists():
            out = BytesIO()
            qr_img.save(out, format="PNG")
            return out.getvalue()

        # 3) Load logo
        logo = Image.open(self.logo_path).convert("RGBA")

        # 4) Resize logo to <= logo_ratio of QR width
        qr_w, qr_h = qr_img.size
        max_logo_w = max(1, int(qr_w * float(logo_ratio)))
        logo.thumbnail((max_logo_w, max_logo_w), Image.Resampling.LANCZOS)

        # 5) Add white background padding behind logo
        backplate_w = logo.size[0] + logo_padding * 2
        backplate_h = logo.size[1] + logo_padding * 2
        backplate = Image.new("RGBA", (backplate_w, backplate_h), (255, 255, 255, 255))
        backplate.paste(logo, (logo_padding, logo_padding), mask=logo)

        # 6) Paste at center
        x = (qr_w - backplate_w) // 2
        y = (qr_h - backplate_h) // 2
        final_img = qr_img.copy()
        final_img.alpha_composite(backplate, (x, y))

        out = BytesIO()
        final_img.save(out, format="PNG")
        return out.getvalue()
