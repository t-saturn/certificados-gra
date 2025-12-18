from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import segno
from PIL import Image


@dataclass(frozen=True)
class QrService:
    """
    SRP: Generates QR codes (PNG bytes) for a verification URL.
    Optionally embeds a local logo (app/assets/logo.png).
    """
    logo_path: Path

    def generate_png(self, *, base_url: str, verify_code: str, scale: int = 20, border: int = 4, logo_ratio: float = 0.25, logo_padding: int = 10) -> bytes:
        base_url = (base_url or "").strip()
        verify_code = (verify_code or "").strip()

        if not base_url:
            raise ValueError("base_url is required")
        if not verify_code:
            raise ValueError("verify_code is required")

        target = f"{base_url}?verify_code={verify_code}"

        # High error correction: better scannability with logo
        qr = segno.make(target, error="h")

        # Render QR to PNG in memory
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

        # If logo doesn't exist, return plain QR
        if not self.logo_path.exists():
            out = BytesIO()
            qr_img.save(out, format="PNG")
            return out.getvalue()

        # Load logo (local file)
        logo = Image.open(self.logo_path).convert("RGBA")

        # Resize logo to <= logo_ratio of QR width
        qr_w, qr_h = qr_img.size
        max_logo = max(1, int(qr_w * float(logo_ratio)))
        logo.thumbnail((max_logo, max_logo), Image.Resampling.LANCZOS)

        # White backplate behind logo (padding)
        back_w = logo.size[0] + logo_padding * 2
        back_h = logo.size[1] + logo_padding * 2
        backplate = Image.new("RGBA", (back_w, back_h), (255, 255, 255, 255))
        backplate.paste(logo, (logo_padding, logo_padding), mask=logo)

        # Paste in center
        x = (qr_w - back_w) // 2
        y = (qr_h - back_h) // 2
        final_img = qr_img.copy()
        final_img.alpha_composite(backplate, (x, y))

        out = BytesIO()
        final_img.save(out, format="PNG")
        return out.getvalue()
