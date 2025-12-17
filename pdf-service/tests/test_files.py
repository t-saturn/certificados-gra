import time
import hmac
import hashlib
from uuid import UUID

import pytest
import httpx

from app.core.config import Settings
from app.repositories.files_repository import HttpFilesRepository
from app.services.file_service import FileService


def _expected_sig(secret: str, method: str, path: str, ts: int) -> str:
    s = f"{method}\n{path}\n{ts}"
    return hmac.new(secret.encode("utf-8"), s.encode("utf-8"), hashlib.sha256).hexdigest()


@pytest.fixture
def settings(monkeypatch) -> Settings:
    monkeypatch.setenv("FILE_SERVER", "https://files-demo.regionayacucho.gob.pe/public")
    monkeypatch.setenv("FILE_ACCESS_KEY", "test_access")
    monkeypatch.setenv("FILE_SECRET_KEY", "test_secret")
    monkeypatch.setenv("FILE_PROJECT_ID", "f13fe72f-d50c-4824-9f8c-b073a7f93aaf")
    monkeypatch.setenv("SERVER_PORT", "8001")
    return Settings()


@pytest.mark.asyncio
async def test_fn_download_file_signing(settings, monkeypatch):
    fixed_ts = 1734451200
    monkeypatch.setattr(time, "time", lambda: fixed_ts)

    file_id = UUID("665190a7-8996-4612-b2a1-de8ead4ec3bb")
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["path"] = request.url.path
        captured["headers"] = dict(request.headers)
        return httpx.Response(200, content=b"%PDF", headers={"content-type": "application/pdf"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    repo = HttpFilesRepository(public_base_url=settings.FILE_SERVER, client=client)
    svc = FileService(settings=settings, repo=repo)

    resp = await svc.fn_download_file(file_id)

    assert resp.status_code == 200
    assert resp.content == b"%PDF"

    # upstream path includes /public
    assert captured["path"] == f"/public/files/{file_id}"

    # signature path must be WITHOUT /public
    signed_path = f"/files/{file_id}"
    assert captured["headers"]["x-access-key"] == "test_access"
    assert captured["headers"]["x-timestamp"] == str(int(fixed_ts))
    assert captured["headers"]["x-signature"] == _expected_sig("test_secret", "GET", signed_path, fixed_ts)

    await client.aclose()


@pytest.mark.asyncio
async def test_fn_upload_file_uses_env_project_id(settings, monkeypatch):
    fixed_ts = 1734451200
    monkeypatch.setattr(time, "time", lambda: fixed_ts)

    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["path"] = request.url.path
        captured["headers"] = dict(request.headers)

        body = request.content or b""
        assert b'name="project_id"' in body
        assert settings.FILE_PROJECT_ID.encode() in body

        return httpx.Response(200, json={"status": "success", "data": {"id": "x"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    repo = HttpFilesRepository(public_base_url=settings.FILE_SERVER, client=client)
    svc = FileService(settings=settings, repo=repo)

    resp = await svc.fn_upload_file(
        user_id="user-123",
        is_public=True,
        filename="a.pdf",
        content_type="application/pdf",
        content=b"%PDF",
    )

    assert resp.status_code == 200
    assert captured["method"] == "POST"
    assert captured["path"] == "/api/v1/files"

    signed_path = "/api/v1/files"
    assert captured["headers"]["x-signature"] == _expected_sig("test_secret", "POST", signed_path, fixed_ts)

    await client.aclose()
