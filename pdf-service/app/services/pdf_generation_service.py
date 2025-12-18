from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
import re

from app.core.config import Settings
from app.services.file_service import FileService
from app.services.qr_service import QrService
from app.services.pdf_service import PdfService


def _parse_float(value: str | float | int | None, default: float) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    return float(s) if s else default


def _parse_int(value: str | int | None, default: int) -> int:
    if value is None:
        return default
    if isinstance(value, int):
        return value
    s = str(value).strip()
    return int(s) if s else default


def _parse_rect(value: str | None) -> Optional[Tuple[float, float, float, float]]:
    """
    Accepts:
      - "x0,y0,x1,y1"
      - "[x0,y0,x1,y1]"
    """
    if not value:
        return None
    s = value.strip()
    if s.startswith("[") and s.endswith("]"):
        s = s[1:-1]
    parts = [p.strip() for p in s.split(",")]
    if len(parts) != 4:
        raise ValueError("qr_rect must have 4 values: x0,y0,x1,y1")
    return (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))


def _first_value(items: List[Dict[str, Any]], key: str) -> Optional[str]:
    """
    For payload style: [{ "verify_code": "..." }, { "base_url": "..." }]
    """
    for it in items:
        if key in it and it[key] is not None:
            return str(it[key]).strip()
    return None

def _safe_filename(name: str) -> str:
    name = (name or "").strip()
    # deja letras/números/guion/underscore/punto
    name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
    name = name.strip("._-")
    return name or "generated"

@dataclass(frozen=True)
class PdfGenerationService:
    """
    Orchestrates:
      - download template (FileService)
      - generate QR (QrService)
      - edit PDF (PdfService)
      - upload final PDF (FileService)
    """

    settings: Settings
    file_service: FileService
    qr_service: QrService
    pdf_service: PdfService

    async def generate_and_upload(
        self,
        *,
        template_file_id: UUID,
        qr: List[Dict[str, Any]],
        qr_pdf: List[Dict[str, Any]],
        pdf: List[Dict[str, str]],
        output_filename: str | None = None,
        is_public: bool = True,
        user_id: str = "system",
    ) -> Dict[str, Any]:
        """
        Returns:
          { "message": "...", "file_id": "<uuid>", "verify_code": "..." }
        """

        # -------- 1) Read QR inputs --------
        base_url = _first_value(qr, "base_url")
        verify_code = _first_value(qr, "verify_code")
        if not base_url:
            raise ValueError("qr.base_url is required")
        if not verify_code:
            raise ValueError("qr.verify_code is required")

        # -------- 2) Read QR placement inputs --------
        qr_size_cm = _parse_float(_first_value(qr_pdf, "qr_size_cm"), 2.5)
        qr_margin_y_cm = _parse_float(_first_value(qr_pdf, "qr_margin_y_cm"), 1.0)
        # qr_margin_x_cm is currently unused in PdfService placement (you can extend later)
        qr_page = _parse_int(_first_value(qr_pdf, "qr_page"), 0)
        qr_rect_raw = _first_value(qr_pdf, "qr_rect")
        portrait_rect = _parse_rect(qr_rect_raw)

        # -------- 3) Download template --------
        tpl_resp = await self.file_service.fn_download_file(template_file_id)

        # IMPORTANT: do NOT call raise_for_status() (breaks when response has no request in tests)
        if tpl_resp.status_code >= 400:
            raise RuntimeError(
                f"Template download failed (status={tpl_resp.status_code})"
            )

        template_pdf_bytes = tpl_resp.content
        if not template_pdf_bytes:
            raise RuntimeError("Template download returned empty body")

        # -------- 4) Generate QR bytes --------
        qr_png = self.qr_service.generate_png(
            base_url=base_url,
            verify_code=verify_code,
        )

        # -------- 5) Produce final PDF bytes --------
        final_pdf_bytes = self.pdf_service.fn_generate_pdf_bytes(
            template_pdf=template_pdf_bytes,
            pdf_items=pdf,  # raw list -> PdfService formats to {{key}}
            qr_png=qr_png,
            qr_page=qr_page,
            qr_rect=portrait_rect,
            qr_size_cm=qr_size_cm,
            qr_margin_y_cm=qr_margin_y_cm,
        )


        # -------- 6) Upload final PDF --------
        # Uses project id from env (Settings.FILE_PROJECT_ID)
        if not output_filename:
            output_filename = f"{_safe_filename(verify_code)}.pdf"

        up_resp = await self.file_service.fn_upload_file(
            user_id=user_id,
            is_public=is_public,
            filename=output_filename,
            content_type="application/pdf",
            content=final_pdf_bytes,
        )

        if up_resp.status_code >= 400:
            raise RuntimeError(f"Upload failed (status={up_resp.status_code})")

        # Expect upstream JSON contains file id (adjust if your upstream uses different fields)
        up_json = up_resp.json()
        uploaded_file_id = (
            up_json.get("data", {}).get("file", {}).get("id")
            or up_json.get("data", {}).get("id")
            or up_json.get("file_id")
            or up_json.get("id")
        )

        if not uploaded_file_id:
            raise RuntimeError("Upload succeeded but could not find uploaded file_id in response")

        return {
            "message": "Documento generado y subido correctamente",
            "file_id": str(uploaded_file_id),
            "verify_code": verify_code,
        }
