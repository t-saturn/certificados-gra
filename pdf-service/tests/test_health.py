import pytest
import httpx

from app.main import create_app


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("SERVER_FILE", "C:/tmp/server")
    monkeypatch.setenv("ACCESS_KEY_FILE", "C:/tmp/access")
    monkeypatch.setenv("SECRET_KEY_FILE", "C:/tmp/secret")
    monkeypatch.setenv("PROJECT_ID_FILE", "C:/tmp/project")
    monkeypatch.setenv("SERVER_PORT", "8001")


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
    assert "checks" in body
