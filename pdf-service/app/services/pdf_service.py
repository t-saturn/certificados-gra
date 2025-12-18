from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Tuple, Optional, List

import fitz  # PyMuPDF


# Helpers internos (privados)

def _norm(s: str) -> str:
    return re.sub(r"\s+", "", s or "")


def _cm_to_pt(cm: float) -> float:
    return (cm * 72.0) / 2.54


def _is_landscape_page(page: fitz.Page) -> bool:
    r = page.rect
    return r.width > r.height


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


def _find_line_containing(page: fitz.Page, placeholder: str):
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
            return bbox, " ".join(w[4] for w in wlist)

    return None, None


def _redact_rect(page: fitz.Page, rect: fitz.Rect, pad=2) -> fitz.Rect:
    r = fitz.Rect(rect.x0 - pad, rect.y0 - pad, rect.x1 + pad, rect.y1 + pad)
    page.add_redact_annot(r, fill=(1, 1, 1))
    page.apply_redactions()
    return r


def _write_text(page: fitz.Page, rect: fitz.Rect, text: str, fontsize: int):
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


# PdfService

@dataclass(frozen=True)
class PdfService:
    """
    SRP:
    - Format placeholders
    - Replace text in PDF
    - Insert QR into PDF
    """

    # 1️ Formatear placeholders
    def fn_format_placeholders(self, items: List[Dict[str, str]]) -> Dict[str, str]:
        """
        Input:
          [{ "key": "nombre", "value": "Juan" }]
        Output:
          { "{{nombre}}": "Juan" }
        """
        out: Dict[str, str] = {}
        for item in items:
            key = (item.get("key") or "").strip()
            val = (item.get("value") or "").strip()
            if key:
                out[f"{{{{{key}}}}}"] = val
        return out

    # 2️ Reemplazo de texto
    def fn_pdf_replace_data(self, doc: fitz.Document, placeholders: Dict[str, str]) -> None:
        for page in doc:
            # líneas
            for ph, value in placeholders.items():
                bbox, _ = _find_line_containing(page, ph)
                if not bbox:
                    continue

                r = _redact_rect(page, bbox, pad=4 if "nombre_participante" in ph.lower() else 2)
                _write_text(page, r, value, fontsize=18 if "nombre_participante" in ph.lower() else 14)

            # bloques
            visited = set()
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

    # 3️ Inserción QR
    def fn_pdf_insert_qr(
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

        if not qr_rect:
            raise ValueError("qr_rect is required for PORTRAIT pages")

        rect = fitz.Rect(*qr_rect)
        page.insert_image(rect, stream=qr_png, keep_proportion=True, overlay=overlay)

    # 4️ Pipeline completo
    def fn_generate_pdf_bytes(
        self,
        *,
        template_pdf: bytes,
        pdf_items: List[Dict[str, str]],
        qr_png: bytes,
        qr_page: int,
        qr_rect: Optional[Tuple[float, float, float, float]],
        qr_size_cm: float,
        qr_margin_y_cm: float,
    ) -> bytes:
        doc = fitz.open(stream=template_pdf, filetype="pdf")

        placeholders = self.fn_format_placeholders(pdf_items)
        self.fn_pdf_replace_data(doc, placeholders)

        self.fn_pdf_insert_qr(
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
