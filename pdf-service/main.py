import json
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF


OUT_DIR_DEFAULT = "docs-generated"


def cm_to_pt(cm: float) -> float:
    return (cm * 72.0) / 2.54


def out_path(out_dir: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(out_dir, exist_ok=True)
    return os.path.join(out_dir, f"generated_{ts}_document.pdf")


def ensure_exists(path: str, label: str):
    if not path or not os.path.exists(path):
        raise FileNotFoundError(f"No existe {label}: {path}")


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s or "")


def block_text(block: dict) -> str:
    lines_out = []
    for line in block.get("lines", []):
        line_text = "".join(span.get("text", "") for span in line.get("spans", []))
        lines_out.append(line_text.rstrip())
    while lines_out and not lines_out[-1].strip():
        lines_out.pop()
    return "\n".join(lines_out)


def find_block_containing(page: fitz.Page, placeholder: str):
    target = norm(placeholder)
    info = page.get_text("dict")

    for idx, b in enumerate(info.get("blocks", [])):
        if b.get("type") != 0:
            continue
        txt = block_text(b)
        if txt and target in norm(txt):
            return fitz.Rect(b["bbox"]), txt, idx

    return None, None, None


def find_line_containing_placeholder(page: fitz.Page, placeholder: str):
    target = norm(placeholder)
    words = page.get_text("words")
    if not words:
        return None, None

    lines = {}
    for w in words:
        x0, y0, x1, y1, txt, block, line, wno = w
        lines.setdefault((block, line), []).append(w)

    for _, wlist in lines.items():
        wlist.sort(key=lambda w: w[0])
        joined = "".join(norm(w[4]) for w in wlist)
        if target in joined:
            rects = [fitz.Rect(w[0], w[1], w[2], w[3]) for w in wlist]
            bbox = rects[0]
            for r in rects[1:]:
                bbox |= r
            text_line = " ".join(w[4] for w in wlist)
            return bbox, text_line

    return None, None


def redact_rect(page: fitz.Page, rect: fitz.Rect, pad=2, fill=(1, 1, 1)) -> fitz.Rect:
    r = fitz.Rect(rect.x0 - pad, rect.y0 - pad, rect.x1 + pad, rect.y1 + pad)
    page.add_redact_annot(r, fill=fill)
    page.apply_redactions()
    return r


def write_in_rect_builtin(page: fitz.Page, rect: fitz.Rect, text: str, fontsize: int, align: int):
    """
    Escribe con fuente builtin (Helvetica: 'helv') sin fontfile.
    Auto-fit: reduce tamaño si no entra.
    """
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


# QR placement
def place_qr_rect(
    doc: fitz.Document,
    image_path: str,
    page_index: int,
    rect: Tuple[float, float, float, float],
    keep_proportion: bool = True,
    overlay: bool = True,
):
    ensure_exists(image_path, "QR image")
    page = doc[page_index]
    r = fitz.Rect(*rect)
    page.insert_image(r, filename=image_path, keep_proportion=keep_proportion, overlay=overlay)


def place_qr_bottom_center(
    doc: fitz.Document,
    image_path: str,
    page_index: int,
    size_cm: float = 2.5,
    margin_y_cm: float = 1.0,
    overlay: bool = True,
):
    """
    Landscape: QR abajo-centro con tamaño fijo (2.5 cm).
    """
    ensure_exists(image_path, "QR image")
    page = doc[page_index]
    pr = page.rect

    size_pt = cm_to_pt(size_cm)
    my = cm_to_pt(margin_y_cm)

    # centrado X
    cx = (pr.x0 + pr.x1) / 2.0
    x0 = cx - size_pt / 2.0
    x1 = cx + size_pt / 2.0

    # abajo
    y1 = pr.y1 - my
    y0 = y1 - size_pt

    rect = fitz.Rect(x0, y0, x1, y1)
    page.insert_image(rect, filename=image_path, keep_proportion=True, overlay=overlay)


# Payload helpers
def kv_list_to_dict(kv_list: List[dict]) -> Dict[str, str]:
    out = {}
    for item in kv_list:
        k = item.get("key")
        v = item.get("value")
        if k is None:
            continue
        out[str(k)] = "" if v is None else str(v)
    return out


def pick_first(d: Dict[str, str], keys: List[str], default: Optional[str] = None) -> Optional[str]:
    for k in keys:
        if k in d and d[k] != "":
            return d[k]
    return default


def parse_rect(value: str) -> Tuple[float, float, float, float]:
    """
    Acepta:
      - "x0,y0,x1,y1"
      - "[x0,y0,x1,y1]"
    """
    s = value.strip()
    if s.startswith("[") and s.endswith("]"):
        s = s[1:-1]
    parts = [p.strip() for p in s.split(",")]
    if len(parts) != 4:
        raise ValueError("qr_rect debe tener 4 valores: x0,y0,x1,y1")
    return (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))


def is_landscape_page(page: fitz.Page) -> bool:
    r = page.rect
    return r.width > r.height


# Placeholder replacement
def apply_placeholders_no_custom_fonts(doc: fitz.Document, placeholders: Dict[str, str]):
    for page in doc:
        # 1) líneas (nombre + firmas)
        for ph, value in placeholders.items():
            bbox_line, _ = find_line_containing_placeholder(page, ph)
            if not bbox_line:
                continue

            # nombre un poco más grande
            if ph.strip().lower() in ("{{nombre_participante}}", "{{NOMBRE_PARTICIPANTE}}"):
                r = redact_rect(page, bbox_line, pad=4)
                write_in_rect_builtin(page, r, value, fontsize=18, align=fitz.TEXT_ALIGN_CENTER)
            else:
                r = redact_rect(page, bbox_line, pad=2)
                write_in_rect_builtin(page, r, value, fontsize=14, align=fitz.TEXT_ALIGN_CENTER)

        # 2) bloques (párrafos): reescribir 1 vez por bloque
        visited_blocks = set()
        for ph in placeholders.keys():
            bbox, txt, block_idx = find_block_containing(page, ph)
            if bbox is None or txt is None or block_idx is None:
                continue
            if block_idx in visited_blocks:
                continue

            replaced = txt
            changed = False
            for ph2, val2 in placeholders.items():
                if norm(ph2) in norm(replaced):
                    replaced = replaced.replace(ph2, val2)
                    replaced = re.sub(re.escape(ph2), val2, replaced)
                    changed = True

            if changed:
                visited_blocks.add(block_idx)
                r = redact_rect(page, bbox, pad=3)
                write_in_rect_builtin(page, r, replaced, fontsize=14, align=fitz.TEXT_ALIGN_CENTER)


# MAIN entry: modify_from_kv_json
def modify_from_kv_json(kv_json: str) -> str:
    """
    Entrada: JSON string de [{key,value}, ...]

    Config:
      - template: ruta PDF
      - out_dir (opcional)
      - qr_image (opcional)
      - qr_page (opcional, default 0)
      - qr_size_cm (opcional, default 2.5)  -> usado solo para LANDSCAPE abajo-centro
      - qr_margin_y_cm (opcional, default 1.0) -> usado solo para LANDSCAPE abajo-centro
      - qr_rect (opcional) -> usado para PORTRAIT (mantener QR “donde está”)

    Reemplazos:
      - keys con {{...}} -> value
    """
    kv_list = json.loads(kv_json)
    d = kv_list_to_dict(kv_list)

    template = pick_first(d, ["template", "template_pdf", "pdf", "input_pdf"])
    out_dir = pick_first(d, ["out_dir", "output_dir"], OUT_DIR_DEFAULT)

    ensure_exists(template, "template PDF")
    doc = fitz.open(template)

    # QR
    qr_image = pick_first(d, ["qr_image", "qr", "qr_path"])
    qr_page = int(pick_first(d, ["qr_page"], "0"))
    qr_rect_raw = pick_first(d, ["qr_rect"], None)

    if qr_image:
        ensure_exists(qr_image, "QR image")
        page = doc[qr_page]

        if is_landscape_page(page):
            # LANDSCAPE -> abajo al centro (2.5 cm)
            qr_size_cm = float(pick_first(d, ["qr_size_cm"], "2.5"))
            qr_margin_y_cm = float(pick_first(d, ["qr_margin_y_cm"], "1.0"))
            place_qr_bottom_center(doc, qr_image, qr_page, size_cm=qr_size_cm, margin_y_cm=qr_margin_y_cm, overlay=True)
        else:
            # PORTRAIT -> “donde está”: por coordenadas si te las pasan
            if not qr_rect_raw:
                raise ValueError("Para PORTRAIT debes enviar 'qr_rect' (x0,y0,x1,y1) para mantener el QR en su sitio.")
            rect = parse_rect(qr_rect_raw)
            place_qr_rect(doc, qr_image, qr_page, rect=rect, keep_proportion=True, overlay=True)

    # Reemplazos {{...}}
    placeholders = {k: v for k, v in d.items() if "{{" in k and "}}" in k}
    apply_placeholders_no_custom_fonts(doc, placeholders)

    out = out_path(out_dir)
    doc.save(out, deflate=True)
    doc.close()
    return out


# Example
if __name__ == "__main__":
    # LANDSCAPE: QR abajo-centro automático
    payload_land = [
        {"key": "template", "value": "landspace-template.pdf"},
        {"key": "qr_image", "value": "qr_composable.png"},
        {"key": "qr_page", "value": "0"},
        {"key": "qr_size_cm", "value": "2.5"},
        {"key": "qr_margin_y_cm", "value": "1.0"},

        {"key": "{{nombre_participante}}", "value": "JUAN PÉREZ GARCÍA"},
        {"key": "{{dd/mm/yyyy}}", "value": "15/12/2024"},
        {"key": "{{firma_1_nombre}}", "value": "Dr. Carlos Mendoza"},
        {"key": "{{firma_1_cargo}}", "value": "Director de Bienestar Social"},
        {"key": "{{firma_2_nombre}}", "value": "Lic. Ana Ramírez"},
        {"key": "{{firma_2_cargo}}", "value": "Coordinadora de Programas"},
    ]

    # PORTRAIT: QR por coordenadas (mantener “donde está”)
    payload_port = [
        {"key": "template", "value": "portrait-template.pdf"},
        {"key": "qr_image", "value": "qr_composable.png"},
        {"key": "qr_page", "value": "0"},
        {"key": "qr_rect", "value": "460,40,540,120"},

        {"key": "{{nombre_participante}}", "value": "JUAN PÉREZ GARCÍA"},
        {"key": "{{dd/mm/yyyy}}", "value": "15/12/2024"},
        {"key": "{{firma_1_nombre}}", "value": "Dr. Carlos Mendoza"},
        {"key": "{{firma_1_cargo}}", "value": "Director de Bienestar Social"},
    ]

    out1 = modify_from_kv_json(json.dumps(payload_land, ensure_ascii=False))
    print("OK LANDSCAPE ->", out1)

    out2 = modify_from_kv_json(json.dumps(payload_port, ensure_ascii=False))
    print("OK PORTRAIT ->", out2)
