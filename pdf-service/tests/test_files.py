import time
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
    monkeypatch.setenv("FILE_PROJECT_ID", "test_project")
    monkeypatch.setenv("SERVER_PORT", "8001")
    monkeypatch.setenv("ENV", "dev")


@pytest.mark.asyncio
async def test_download_file_invalid_uuid():
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/files/not-a-uuid")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "file_id must be a UUID"


@pytest.mark.asyncio
async def test_download_file_success(monkeypatch):
    fixed_ts = 1734451200  # any fixed epoch
    monkeypatch.setattr(time, "time", lambda: fixed_ts)

    file_id = UUID("665190a7-8996-4612-b2a1-de8ead4ec3bb")
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        # Capture headers & url for assertions
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        return httpx.Response(
            200,
            headers={
                "content-type": "application/pdf",
                "content-disposition": 'inline; filename="x.pdf"',
                "cache-control": "public, max-age=31536000",
            },
            content=b"%PDF-1.4 test",
        )

    # Override repository to use MockTransport
    mock_transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=mock_transport)

    def override_repo():
        return HttpFilesRepository(
            base_url="https://files-demo.regionayacucho.gob.pe/public",
            client=client,
        )

    app = create_app()
    app.dependency_overrides[get_files_repository] = override_repo

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(f"/files/{file_id}")

    assert resp.status_code == 200
    assert resp.content == b"%PDF-1.4 test"
    assert resp.headers["content-type"] == "application/pdf"
    assert "content-disposition" in resp.headers

    # Verify upstream URL
    assert captured["url"].endswith(f"/public/files/{file_id}")

    # Verify auth headers
    assert captured["headers"]["x-access-key"] == "test_access"
    assert captured["headers"]["x-timestamp"] == str(int(fixed_ts))

    # Verify signature matches Bruno algorithm
    import hmac, hashlib
    string_to_sign = f"GET\n/files/{file_id}\n{int(fixed_ts)}"
    expected_sig = hmac.new(
        b"test_secret", string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    assert captured["headers"]["x-signature"] == expected_sig

    await client.aclose()
