from uuid import UUID

import pytest
import httpx
import fitz

from app.core.config import Settings
from app.services.pdf_service import PdfService
from app.services.pdf_generation_service import PdfGenerationService


class FakeFileService:
    def __init__(self, template_pdf_bytes: bytes):
        self.template_pdf_bytes = template_pdf_bytes
        self.upload_called = False
        self.upload_content = b""

    async def fn_download_file(self, file_id: UUID) -> httpx.Response:
        req = httpx.Request("GET", f"http://test/files/{file_id}")
        return httpx.Response(
            200,
            request=req,
            content=self.template_pdf_bytes,
            headers={"content-type": "application/pdf"},
        )

    async def fn_upload_file(self, **kwargs) -> httpx.Response:
        self.upload_called = True
        self.upload_content = kwargs["content"]
        req = httpx.Request("POST", "http://test/api/v1/files")
        return httpx.Response(200, request=req, json={"status": "success"})


class FakeQrService:
    def generate_png(self, *, base_url: str, verify_code: str) -> bytes:
        # return a minimal valid PNG (1x1) via pillow-like bytes is heavy; easiest generate via segno
        import segno
        from io import BytesIO
        qr = segno.make("x", error="h")
        buf = BytesIO()
        qr.save(buf, kind="png", scale=2, border=1)
        return buf.getvalue()


def _make_template_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "{{nombre_participante}}", fontsize=14)
    out = doc.tobytes()
    doc.close()
    return out


@pytest.mark.asyncio
async def test_generate_and_upload_pipeline(monkeypatch):
    # env settings (minimal)
    monkeypatch.setenv("FILE_SERVER", "https://files-demo.regionayacucho.gob.pe/public")
    monkeypatch.setenv("FILE_ACCESS_KEY", "ak")
    monkeypatch.setenv("FILE_SECRET_KEY", "sk")
    monkeypatch.setenv("FILE_PROJECT_ID", "f13fe72f-d50c-4824-9f8c-b073a7f93aaf")
    monkeypatch.setenv("SERVER_PORT", "8001")
    s = Settings()

    tpl = _make_template_pdf_bytes()
    file_svc = FakeFileService(tpl)
    qr_svc = FakeQrService()
    pdf_svc = PdfService()

    gen = PdfGenerationService(
        settings=s,
        file_service=file_svc,   # fake
        qr_service=qr_svc,       # fake
        pdf_service=pdf_svc,
    )

    resp = await gen.generate_and_upload(
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

    assert resp.status_code == 200
    assert file_svc.upload_called is True
    assert file_svc.upload_content[:4] == b"%PDF"
