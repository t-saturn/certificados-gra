"""
PDF QR code insertion service.
SRP: Insert QR images into PDF documents.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import fitz  # PyMuPDF

from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


def _cm_to_pt(cm: float) -> float:
    """Convert centimeters to points."""
    return (cm * 72.0) / 2.54


def _is_landscape_page(page: fitz.Page) -> bool:
    """Check if page is landscape orientation."""
    r = page.rect
    return r.width > r.height


@dataclass(frozen=True)
class PdfQrInsertService:
    """
    PDF QR code insertion service.

    SRP: Insert QR images into PDF documents at specified positions.
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
        qr_margin_x_cm: float = 1.0,
        overlay: bool = True,
    ) -> None:
        """
        Insert QR code image into PDF page.

        For landscape pages, auto-calculates center-bottom position.
        For portrait pages, requires explicit qr_rect.

        Args:
            doc: PyMuPDF Document object
            qr_png: QR code PNG image bytes
            qr_page: Page index (0-based)
            qr_rect: Explicit position (x0, y0, x1, y1) in points
            qr_size_cm: QR code size in centimeters (for auto-placement)
            qr_margin_y_cm: Bottom margin in centimeters
            qr_margin_x_cm: Side margin in centimeters (unused in center placement)
            overlay: If True, place QR over existing content

        Raises:
            ValueError: If portrait page and no qr_rect provided
            IndexError: If qr_page is out of range
        """
        if qr_page >= len(doc):
            raise IndexError(f"Page {qr_page} out of range (doc has {len(doc)} pages)")

        page = doc[qr_page]
        pr = page.rect

        logger.debug(
            "inserting_qr",
            page=qr_page,
            page_size=(pr.width, pr.height),
            is_landscape=_is_landscape_page(page),
        )

        # Landscape auto-placement (center-bottom)
        if _is_landscape_page(page):
            size_pt = _cm_to_pt(qr_size_cm)
            my = _cm_to_pt(qr_margin_y_cm)

            cx = (pr.x0 + pr.x1) / 2
            x0, x1 = cx - size_pt / 2, cx + size_pt / 2
            y1 = pr.y1 - my
            y0 = y1 - size_pt

            rect = fitz.Rect(x0, y0, x1, y1)
            page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)
            logger.info("qr_inserted_landscape", page=qr_page, rect=(x0, y0, x1, y1))
            return

        # Portrait requires explicit rect
        if not qr_rect:
            raise ValueError("qr_rect is required for PORTRAIT pages")

        rect = fitz.Rect(*qr_rect)
        page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)
        logger.info("qr_inserted_portrait", page=qr_page, rect=qr_rect)

    def insert_qr_bytes(
        self,
        *,
        input_pdf: bytes,
        qr_png: bytes,
        qr_page: int,
        qr_rect: Optional[Tuple[float, float, float, float]] = None,
        qr_size_cm: float = 2.5,
        qr_margin_y_cm: float = 1.0,
        qr_margin_x_cm: float = 1.0,
    ) -> bytes:
        """
        Insert QR code into PDF and return modified PDF bytes.

        Args:
            input_pdf: Input PDF bytes
            qr_png: QR code PNG image bytes
            qr_page: Page index (0-based)
            qr_rect: Explicit position (x0, y0, x1, y1) in points
            qr_size_cm: QR code size in centimeters
            qr_margin_y_cm: Bottom margin in centimeters
            qr_margin_x_cm: Side margin in centimeters

        Returns:
            Modified PDF bytes with QR inserted
        """
        logger.info("processing_qr_insertion", page=qr_page, has_rect=qr_rect is not None)

        doc = fitz.open(stream=input_pdf, filetype="pdf")
        self.insert_qr(
            doc,
            qr_png=qr_png,
            qr_page=qr_page,
            qr_rect=qr_rect,
            qr_size_cm=qr_size_cm,
            qr_margin_y_cm=qr_margin_y_cm,
            qr_margin_x_cm=qr_margin_x_cm,
        )

        out = doc.write(deflate=True)
        doc.close()

        logger.info("qr_insertion_complete", output_size=len(out))
        return out

    async def insert_qr_bytes_async(
        self,
        *,
        input_pdf: bytes,
        qr_png: bytes,
        qr_page: int,
        qr_rect: Optional[Tuple[float, float, float, float]] = None,
        qr_size_cm: float = 2.5,
        qr_margin_y_cm: float = 1.0,
        qr_margin_x_cm: float = 1.0,
    ) -> bytes:
        """Async wrapper for insert_qr_bytes (CPU-bound operation)."""
        import asyncio

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.insert_qr_bytes(
                input_pdf=input_pdf,
                qr_png=qr_png,
                qr_page=qr_page,
                qr_rect=qr_rect,
                qr_size_cm=qr_size_cm,
                qr_margin_y_cm=qr_margin_y_cm,
                qr_margin_x_cm=qr_margin_x_cm,
            ),
        )
