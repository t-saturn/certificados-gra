from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import fitz  # PyMuPDF


def _cm_to_pt(cm: float) -> float:
    return (cm * 72.0) / 2.54


def _is_landscape_page(page: fitz.Page) -> bool:
    r = page.rect
    return r.width > r.height


@dataclass(frozen=True)
class PdfQrInsertService:
    """
    SRP: Insert QR image into a PDF document.
    """

    def insert_qr(
        self,
        doc: fitz.Document,
        *,
        qr_png: bytes,
        qr_page: int,
        qr_rect: Optional[Tuple[float, float, float, float]] = None,
        qr_size_cm: float = 2.5,
        qr_margin_y_cm: float = 1.0,
        overlay: bool = True,
    ) -> None:
        page = doc[qr_page]

        # landscape auto-placement
        if _is_landscape_page(page):
            pr = page.rect
            size_pt = _cm_to_pt(qr_size_cm)
            my = _cm_to_pt(qr_margin_y_cm)

            cx = (pr.x0 + pr.x1) / 2
            x0, x1 = cx - size_pt / 2, cx + size_pt / 2
            y1 = pr.y1 - my
            y0 = y1 - size_pt

            rect = fitz.Rect(x0, y0, x1, y1)
            page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)
            return

        # portrait requires explicit rect
        if not qr_rect:
            raise ValueError("qr_rect is required for PORTRAIT pages")

        rect = fitz.Rect(*qr_rect)
        page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)

    def insert_qr_bytes(
        self,
        *,
        input_pdf: bytes,
        qr_png: bytes,
        qr_page: int,
        qr_rect: Optional[Tuple[float, float, float, float]] = None,
        qr_size_cm: float = 2.5,
        qr_margin_y_cm: float = 1.0,
    ) -> bytes:
        doc = fitz.open(stream=input_pdf, filetype="pdf")
        self.insert_qr(
            doc,
            qr_png=qr_png,
            qr_page=qr_page,
            qr_rect=qr_rect,
            qr_size_cm=qr_size_cm,
            qr_margin_y_cm=qr_margin_y_cm,
        )
        out = doc.write(deflate=True)
        doc.close()
        return out
