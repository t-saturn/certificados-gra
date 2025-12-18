from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, Tuple, Optional

import fitz  # PyMuPDF


def _norm(s: str) -> str:
    return re.sub(r"\s+", "", s or "")


def _block_text(block: dict) -> str:
    lines_out = []
    for line in block.get("lines", []):
        line_text = "".join(span.get("text", "") for span in line.get("spans", []))
        lines_out.append(line_text.rstrip())
    while lines_out and not lines_out[-1].strip():
        lines_out.pop()
    return "\n".join(lines_out)


def _find_block_containing(page: fitz.Page, placeholder: str):
    target = _norm(placeholder)
    info = page.get_text("dict")

    for idx, b in enumerate(info.get("blocks", [])):
        if b.get("type") != 0:
            continue
        txt = _block_text(b)
        if txt and target in _norm(txt):
            return fitz.Rect(b["bbox"]), txt, idx

    return None, None, None


def _find_line_containing_placeholder(page: fitz.Page, placeholder: str):
    target = _norm(placeholder)
    words = page.get_text("words")
    if not words:
        return None, None

    lines = {}
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
            text_line = " ".join(w[4] for w in wlist)
            return bbox, text_line

    return None, None


def _redact_rect(page: fitz.Page, rect: fitz.Rect, pad=2, fill=(1, 1, 1)) -> fitz.Rect:
    r = fitz.Rect(rect.x0 - pad, rect.y0 - pad, rect.x1 + pad, rect.y1 + pad)
    page.add_redact_annot(r, fill=fill)
    page.apply_redactions()
    return r


def _write_in_rect_builtin(page: fitz.Page, rect: fitz.Rect, text: str, fontsize: int, align: int):
    size = fontsize
    rc = page.insert_textbox(
        rect,
        text,
        fontname="helv",
        fontsize=size,
        color=(0, 0, 0),
        align=align,
    )
    while rc < 0 and size > 6:
        size -= 1
        rc = page.insert_textbox(
            rect,
            text,
            fontname="helv",
            fontsize=size,
            color=(0, 0, 0),
            align=align,
        )


def _is_landscape_page(page: fitz.Page) -> bool:
    r = page.rect
    return r.width > r.height


def _cm_to_pt(cm: float) -> float:
    return (cm * 72.0) / 2.54


@dataclass(frozen=True)
class PdfService:
    """
    SRP: PDF editing operations (replace placeholders, insert QR).
    """

    def fn_pdf_replace_data(self, doc: fitz.Document, placeholders: Dict[str, str]) -> None:
        """
        Mutates doc in-place: replaces placeholders using redaction + insert_textbox.
        """
        for page in doc:
            # 1) lines
            for ph, value in placeholders.items():
                bbox_line, _ = _find_line_containing_placeholder(page, ph)
                if not bbox_line:
                    continue

                if ph.strip().lower() in ("{{nombre_participante}}", "{{nombre_participante}}".upper()):
                    r = _redact_rect(page, bbox_line, pad=4)
                    _write_in_rect_builtin(page, r, value, fontsize=18, align=fitz.TEXT_ALIGN_CENTER)
                else:
                    r = _redact_rect(page, bbox_line, pad=2)
                    _write_in_rect_builtin(page, r, value, fontsize=14, align=fitz.TEXT_ALIGN_CENTER)

            # 2) blocks
            visited_blocks = set()
            for ph in placeholders.keys():
                bbox, txt, block_idx = _find_block_containing(page, ph)
                if bbox is None or txt is None or block_idx is None:
                    continue
                if block_idx in visited_blocks:
                    continue

                replaced = txt
                changed = False
                for ph2, val2 in placeholders.items():
                    if _norm(ph2) in _norm(replaced):
                        replaced = replaced.replace(ph2, val2)
                        replaced = re.sub(re.escape(ph2), val2, replaced)
                        changed = True

                if changed:
                    visited_blocks.add(block_idx)
                    r = _redact_rect(page, bbox, pad=3)
                    _write_in_rect_builtin(page, r, replaced, fontsize=14, align=fitz.TEXT_ALIGN_CENTER)

    def fn_pdf_insert_qr(
        self,
        doc: fitz.Document,
        *,
        qr_png: bytes,
        page_index: int = 0,
        portrait_rect: Optional[Tuple[float, float, float, float]] = None,
        landscape_size_cm: float = 2.5,
        landscape_margin_y_cm: float = 1.0,
        overlay: bool = True,
    ) -> None:
        """
        Inserts QR image in-place.
        - Landscape: bottom-center fixed size (cm)
        - Portrait: requires portrait_rect (x0,y0,x1,y1)
        """
        page = doc[page_index]

        if _is_landscape_page(page):
            pr = page.rect
            size_pt = _cm_to_pt(landscape_size_cm)
            my = _cm_to_pt(landscape_margin_y_cm)

            cx = (pr.x0 + pr.x1) / 2.0
            x0 = cx - size_pt / 2.0
            x1 = cx + size_pt / 2.0

            y1 = pr.y1 - my
            y0 = y1 - size_pt

            rect = fitz.Rect(x0, y0, x1, y1)
            page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)
            return

        # Portrait
        if portrait_rect is None:
            raise ValueError("portrait_rect is required for PORTRAIT pages (x0,y0,x1,y1)")
        rect = fitz.Rect(*portrait_rect)
        page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)
