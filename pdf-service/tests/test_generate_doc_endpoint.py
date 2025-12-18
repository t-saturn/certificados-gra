import pytest
import httpx

from app.main import create_app


class FakePdfGenerationService:
    async def generate_and_upload(self, **kwargs):
        # devuelve file_id distinto por user_id para test
        user_id = kwargs.get("user_id", "system")
        return {"message": "ok", "file_id": f"uploaded-{user_id[:6]}"}


@pytest.mark.asyncio
async def test_generate_doc_ok_array():
    app = create_app()

    from app.deps import get_pdf_generation_service
    app.dependency_overrides[get_pdf_generation_service] = lambda: FakePdfGenerationService()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = [
            {
                "template": "89ab202f-02e0-4da0-bdbf-68be7631dc2a",
                "user_id": "f3b6c2a1-9e7d-4c5a-b2f1-6d8a9c0e7b24",
                "is_public": True,
                "qr": [
                    {"base_url": "https://regionayacucho.gob.pe/verify"},
                    {"verify_code": "CERT-OTIC-2025-000001"},
                ],
                "qr_pdf": [
                    {"qr_size_cm": "2.5"},
                    {"qr_margin_y_cm": "1.0"},
                    {"qr_margin_x_cm": "1.0"},
                    {"qr_page": "0"},
                    {"qr_rect": "460,40,540,120"},
                ],
                "pdf": [{"key": "nombre_participante", "value": "JUAN"}],
            }
        ]

        resp = await ac.post("/generate-doc", json=payload)

    assert resp.status_code == 200
    body = resp.json()
    assert body["message"]
    assert "docs" in body
    assert body["docs"][0]["user_id"] == payload[0]["user_id"]
    assert body["docs"][0]["file_id"].startswith("uploaded-")


@pytest.mark.asyncio
async def test_generate_doc_bad_uuid_array():
    app = create_app()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/generate-doc",
            json=[
                {
                    "template": "not-a-uuid",
                    "user_id": "x",
                    "is_public": True,
                    "qr": [],
                    "qr_pdf": [],
                    "pdf": [],
                }
            ],
        )

    assert resp.status_code == 400
