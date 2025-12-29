"""
PDF text replacement service.
SRP: Replace placeholder text in PDF documents.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List

import fitz  # PyMuPDF

from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


def _norm(s: str) -> str:
    """Normalize string by removing whitespace."""
    return re.sub(r"\s+", "", s or "")


def _block_text(block: dict) -> str:
    """Extract text from a PDF text block."""
    lines_out = []
    for line in block.get("lines", []):
        line_text = "".join(span.get("text", "") for span in line.get("spans", []))
        lines_out.append(line_text.rstrip())
    while lines_out and not lines_out[-1].strip():
        lines_out.pop()
    return "\n".join(lines_out)


def _find_block_containing(page: fitz.Page, placeholder: str) -> tuple:
    """Find a text block containing the placeholder."""
    target = _norm(placeholder)
    info = page.get_text("dict")

    for idx, b in enumerate(info.get("blocks", [])):
        if b.get("type") != 0:
            continue
        txt = _block_text(b)
        if txt and target in _norm(txt):
            return fitz.Rect(b["bbox"]), txt, idx

    return None, None, None


def _find_line_containing(page: fitz.Page, placeholder: str) -> tuple:
    """Find a line containing the placeholder."""
    target = _norm(placeholder)
    words = page.get_text("words")
    if not words:
        return None, None

    lines: dict = {}
    for w in words:
        x0, y0, x1, y1, txt, block, line, wno = w
        lines.setdefault((block, line), []).append(w)

    for _, wlist in lines.items():
        wlist.sort(key=lambda w: w[0])
        joined = "".join(_norm(w[4]) for w in wlist)
        if target in joined:
            rects = [fitz.Rect(w[0], w[1], w[2], w[3]) for w in wlist]
            bbox = rects[0]
            for r in rects[1:]:
                bbox |= r
            return bbox, " ".join(w[4] for w in wlist)

    return None, None


def _redact_rect(page: fitz.Page, rect: fitz.Rect, pad: int = 2) -> fitz.Rect:
    """Redact (white out) a rectangular area."""
    r = fitz.Rect(rect.x0 - pad, rect.y0 - pad, rect.x1 + pad, rect.y1 + pad)
    page.add_redact_annot(r, fill=(1, 1, 1))
    page.apply_redactions()
    return r


def _write_text(page: fitz.Page, rect: fitz.Rect, text: str, fontsize: int) -> None:
    """Write text into a rectangular area, auto-sizing if needed."""
    size = fontsize
    rc = page.insert_textbox(
        rect,
        text,
        fontname="helv",
        fontsize=size,
        color=(0, 0, 0),
        align=fitz.TEXT_ALIGN_CENTER,
    )
    while rc < 0 and size > 6:
        size -= 1
        rc = page.insert_textbox(
            rect,
            text,
            fontname="helv",
            fontsize=size,
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_CENTER,
        )


@dataclass(frozen=True)
class PdfReplaceService:
    """
    PDF text replacement service.

    SRP:
      - Format placeholders
      - Replace text in PDF
    """

    def format_placeholders(self, items: List[Dict[str, str]]) -> Dict[str, str]:
        """
        Convert list of key-value items to placeholder dict.

        Args:
            items: List of {"key": "name", "value": "John"} dicts

        Returns:
            Dict mapping "{{name}}" -> "John"
        """
        out: Dict[str, str] = {}
        for item in items:
            key = (item.get("key") or "").strip()
            val = (item.get("value") or "").strip()
            if key:
                out[f"{{{{{key}}}}}"] = val

        logger.debug("placeholders_formatted", count=len(out), keys=list(out.keys()))
        return out

    def replace_data(self, doc: fitz.Document, placeholders: Dict[str, str]) -> int:
        """
        Replace all placeholders in the PDF document.

        Args:
            doc: PyMuPDF Document object
            placeholders: Dict mapping placeholder strings to replacement values

        Returns:
            Number of replacements made
        """
        replacements = 0

        for page_num, page in enumerate(doc):
            logger.debug("processing_page", page=page_num)

            # Line-level replacements
            for ph, value in placeholders.items():
                bbox, _ = _find_line_containing(page, ph)
                if not bbox:
                    continue

                # Larger font for participant names
                is_name = "nombre_participante" in ph.lower()
                pad = 4 if is_name else 2
                fontsize = 18 if is_name else 14

                r = _redact_rect(page, bbox, pad=pad)
                _write_text(page, r, value, fontsize=fontsize)
                replacements += 1
                logger.debug("replaced_line", page=page_num, placeholder=ph)

            # Block-level replacements for remaining
            visited: set = set()
            for ph in placeholders.keys():
                bbox, txt, idx = _find_block_containing(page, ph)
                if bbox is None or idx in visited:
                    continue

                replaced = txt
                changed = False
                for k, v in placeholders.items():
                    if _norm(k) in _norm(replaced):
                        replaced = replaced.replace(k, v)
                        changed = True

                if changed:
                    visited.add(idx)
                    r = _redact_rect(page, bbox, pad=3)
                    _write_text(page, r, replaced, fontsize=14)
                    replacements += 1
                    logger.debug("replaced_block", page=page_num, block_idx=idx)

        logger.info("replacements_complete", total=replacements)
        return replacements

    def render_pdf_bytes(
        self, *, template_pdf: bytes, pdf_items: List[Dict[str, str]]
    ) -> bytes:
        """
        Render PDF with placeholder replacements.

        Args:
            template_pdf: Template PDF bytes
            pdf_items: List of {"key": "...", "value": "..."} items

        Returns:
            Modified PDF bytes
        """
        logger.info("rendering_pdf", items_count=len(pdf_items))

        doc = fitz.open(stream=template_pdf, filetype="pdf")
        placeholders = self.format_placeholders(pdf_items)
        self.replace_data(doc, placeholders)

        out = doc.write(deflate=True)
        doc.close()

        logger.info("pdf_rendered", output_size=len(out))
        return out

    async def render_pdf_bytes_async(
        self, *, template_pdf: bytes, pdf_items: List[Dict[str, str]]
    ) -> bytes:
        """Async wrapper for render_pdf_bytes (CPU-bound operation)."""
        import asyncio

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.render_pdf_bytes(template_pdf=template_pdf, pdf_items=pdf_items),
        )
