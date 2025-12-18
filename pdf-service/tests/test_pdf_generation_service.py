import pytest
from uuid import UUID
from io import BytesIO

import fitz  # PyMuPDF
from PIL import Image  # para generar PNG real en el fake

from app.core.config import Settings
from app.services.pdf_generation_service import PdfGenerationService
from app.services.pdf_service import PdfService


def _make_template_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "{{nombre_participante}}")
    buf = BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


class FakeFileService:
    def __init__(self, template_bytes: bytes):
        self.template_bytes = template_bytes

    async def fn_download_file(self, file_id: UUID):
        class Resp:
            status_code = 200
            content = self.template_bytes
            headers = {"content-type": "application/pdf"}
        return Resp()

    async def fn_upload_file(self, *, user_id: str, is_public: bool, filename: str, content_type: str, content: bytes):
        class Resp:
            status_code = 201

            def json(self):
                # adapta al formato que tu upstream devuelva (si ya lo tienes)
                return {"data": {"id": "uploaded-123"}}

        return Resp()


class FakeQrService:
    def generate_png(self, **kwargs) -> bytes:
        # PNG real 1x1 para que PyMuPDF lo acepte
        img = Image.new("RGB", (1, 1), (255, 255, 255))
        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()


@pytest.mark.asyncio
async def test_generate_and_upload_pipeline(monkeypatch):
    monkeypatch.setenv("FILE_SERVER", "https://files-demo.regionayacucho.gob.pe/public")
    monkeypatch.setenv("FILE_ACCESS_KEY", "ak")
    monkeypatch.setenv("FILE_SECRET_KEY", "sk")
    monkeypatch.setenv("FILE_PROJECT_ID", "f13fe72f-d50c-4824-9f8c-b073a7f93aaf")
    monkeypatch.setenv("SERVER_PORT", "8001")

    settings = Settings()

    file_svc = FakeFileService(_make_template_pdf_bytes())
    qr_svc = FakeQrService()
    pdf_svc = PdfService()

    gen = PdfGenerationService(settings=settings, file_service=file_svc, qr_service=qr_svc, pdf_service=pdf_svc)

    result = await gen.generate_and_upload(
        template_file_id=UUID("665190a7-8996-4612-b2a1-de8ead4ec3bb"),
        qr=[
            {"base_url": "https://regionayacucho.gob.pe/verify"},
            {"verify_code": "CERT-2025-ABCD"},
        ],
        qr_pdf=[
            {"qr_size_cm": "2.5"},
            {"qr_margin_y_cm": "1.0"},
            {"qr_margin_x_cm": "1.0"},
            {"qr_page": "0"},
            {"qr_rect": "450,40,540,130"},
        ],
        pdf=[
            {"key": "nombre_participante", "value": "JUAN PEREZ"},
        ],
        output_filename="out.pdf",
        user_id="system",
        is_public=True,
    )

    assert result["file_id"] == "uploaded-123"
    assert "message" in result
