from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Dict, Optional, Tuple
from uuid import UUID

import fitz  # PyMuPDF

from app.core.config import Settings
from app.services.file_service import FileService
from app.services.pdf_service import PdfService
from app.services.qr_service import QrService


@dataclass(frozen=True)
class PdfGenerationService:
    """
    Orchestrates: download template -> generate QR -> edit PDF -> upload result.
    """
    settings: Settings
    file_service: FileService
    qr_service: QrService
    pdf_service: PdfService

    async def generate_and_upload(
        self,
        *,
        template_file_id: UUID,
        verify_code: str,
        placeholders: Dict[str, str],
        qr_page: int = 0,
        portrait_qr_rect: Optional[Tuple[float, float, float, float]] = None,
        landscape_qr_size_cm: float = 2.5,
        landscape_qr_margin_y_cm: float = 1.0,
        output_filename: str = "generated.pdf",
        is_public: bool = True,
        user_id: str = "system",
    ):
        # 1) Download template PDF bytes
        tpl_resp = await self.file_service.fn_download_file(template_file_id)
        tpl_resp.raise_for_status()
        template_bytes = tpl_resp.content

        # 2) Generate QR PNG bytes
        qr_png = self.qr_service.generate_png(
            base_url="https://regionayacucho.gob.pe/validar",
            verify_code=verify_code,
        )

        # 3) Open PDF in memory
        doc = fitz.open(stream=template_bytes, filetype="pdf")

        # 4) Replace placeholders
        self.pdf_service.fn_pdf_replace_data(doc, placeholders)

        # 5) Insert QR
        self.pdf_service.fn_pdf_insert_qr(
            doc,
            qr_png=qr_png,
            page_index=qr_page,
            portrait_rect=portrait_qr_rect,
            landscape_size_cm=landscape_qr_size_cm,
            landscape_margin_y_cm=landscape_qr_margin_y_cm,
            overlay=True,
        )

        # 6) Save to bytes
        out_pdf = doc.tobytes(deflate=True)
        doc.close()

        # 7) Upload result
        up_resp = await self.file_service.fn_upload_file(
            user_id=user_id,
            is_public=is_public,
            filename=output_filename,
            content_type="application/pdf",
            content=out_pdf,
            # project_id should be taken from settings.FILE_PROJECT_ID (inside service)
        )
        return up_resp
