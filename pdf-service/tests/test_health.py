import pytest
import httpx

from app.main import create_app


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("FILE_SERVER", "https://files-demo.regionayacucho.gob.pe/public")
    monkeypatch.setenv("FILE_ACCESS_KEY", "access_key_value")
    monkeypatch.setenv("FILE_SECRET_KEY", "secret_key_value")
    monkeypatch.setenv("FILE_PROJECT_ID", "project_id_value")
    monkeypatch.setenv("SERVER_PORT", "8001")
    monkeypatch.setenv("ENV", "dev")


@pytest.mark.asyncio
async def test_health_basic():
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_info():
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/health?info=true")

    assert resp.status_code == 200
    body = resp.json()

    assert body["status"] == "ok"
    assert "uptime_seconds" in body
    assert body["config"]["SERVER_PORT"] == 8001

    # presence flags
    assert body["config"]["FILE_SERVER_set"] is True
    assert body["config"]["FILE_ACCESS_KEY_set"] is True
    assert body["config"]["FILE_SECRET_KEY_set"] is True
    assert body["config"]["FILE_PROJECT_ID_set"] is True

    # secrets are not exposed in config
    assert "FILE_ACCESS_KEY" not in body["config"]
    assert "FILE_SECRET_KEY" not in body["config"]

    # optional: fingerprints exist
    assert "FILE_ACCESS_KEY_fp" in body["config"]
    assert len(body["config"]["FILE_ACCESS_KEY_fp"]) == 12
