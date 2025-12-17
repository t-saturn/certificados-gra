import time
import hmac
import hashlib
from uuid import UUID

import pytest
import httpx

from app.main import create_app
from app.deps import get_files_repository
from app.repositories.files_repository import HttpFilesRepository


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("FILE_SERVER", "https://files-demo.regionayacucho.gob.pe/public")
    monkeypatch.setenv("FILE_ACCESS_KEY", "test_access")
    monkeypatch.setenv("FILE_SECRET_KEY", "test_secret")
    monkeypatch.setenv("FILE_PROJECT_ID", "f13fe72f-d50c-4824-9f8c-b073a7f93aaf")
    monkeypatch.setenv("SERVER_PORT", "8001")
    monkeypatch.setenv("ENV", "dev")


def _expected_sig(method: str, path: str, ts: int) -> str:
    s = f"{method}\n{path}\n{ts}"
    return hmac.new(b"test_secret", s.encode("utf-8"), hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_download_invalid_uuid():
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/files/not-a-uuid")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "file_id must be a UUID"


@pytest.mark.asyncio
async def test_download_success_signing(monkeypatch):
    fixed_ts = 1734451200
    monkeypatch.setattr(time, "time", lambda: fixed_ts)

    file_id = UUID("665190a7-8996-4612-b2a1-de8ead4ec3bb")
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["path"] = request.url.path
        captured["headers"] = dict(request.headers)
        return httpx.Response(
            200,
            headers={
                "content-type": "application/pdf",
                "content-disposition": 'inline; filename="portrait-template.pdf"',
            },
            content=b"%PDF-1.4 test",
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    def override_repo():
        return HttpFilesRepository(
            public_base_url="https://files-demo.regionayacucho.gob.pe/public",
            client=client,
        )

    app = create_app()
    app.dependency_overrides[get_files_repository] = override_repo

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(f"/files/{file_id}")

    assert resp.status_code == 200
    assert resp.content == b"%PDF-1.4 test"

    # upstream URL uses /public/files/{uuid}
    assert captured["method"] == "GET"
    assert captured["path"] == f"/public/files/{file_id}"

    # signature uses /files/{uuid} (no /public)
    signed_path = f"/files/{file_id}"
    assert captured["headers"]["x-access-key"] == "test_access"
    assert captured["headers"]["x-timestamp"] == str(int(fixed_ts))
    assert captured["headers"]["x-signature"] == _expected_sig("GET", signed_path, fixed_ts)

    await client.aclose()


@pytest.mark.asyncio
async def test_upload_success_signing_and_env_project_id(monkeypatch):
    fixed_ts = 1734451200
    monkeypatch.setattr(time, "time", lambda: fixed_ts)

    env_project_id = UUID("f13fe72f-d50c-4824-9f8c-b073a7f93aaf")
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["path"] = request.url.path
        captured["headers"] = dict(request.headers)

        body = request.content or b""
        assert b'name="project_id"' in body
        assert str(env_project_id).encode() in body
        assert b'name="user_id"' in body
        assert b"user-123" in body
        assert b'name="is_public"' in body
        assert b"true" in body
        assert b'filename="portrait-template.pdf"' in body
        assert b"%PDF" in body

        return httpx.Response(
            200,
            json={
                "data": {"id": "be79002a-fc58-4be6-ae4c-7b244a5a2c7b"},
                "status": "success",
                "message": "Archivo subido correctamente",
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))

    def override_repo():
        return HttpFilesRepository(
            public_base_url="https://files-demo.regionayacucho.gob.pe/public",
            client=client,
        )

    app = create_app()
    app.dependency_overrides[get_files_repository] = override_repo

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/files",
            data={"user_id": "user-123", "is_public": "true"},
            files={"file": ("portrait-template.pdf", b"%PDF-1.4 test", "application/pdf")},
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # upstream POST goes to /api/v1/files
    assert captured["method"] == "POST"
    assert captured["path"] == "/api/v1/files"

    signed_path = "/api/v1/files"
    assert captured["headers"]["x-access-key"] == "test_access"
    assert captured["headers"]["x-timestamp"] == str(int(fixed_ts))
    assert captured["headers"]["x-signature"] == _expected_sig("POST", signed_path, fixed_ts)

    await client.aclose()
