from __future__ import annotations

import time
from typing import Generator

import httpx
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.repositories.files_repository import HttpFilesRepository
from app.services.file_service import FileService
from app.services.health_service import HealthService
from app.repositories.files_repository import HttpFilesRepository


# --- shared app startup time (used by health) ---
_started_at = time.monotonic()


# --- http client lifecycle ---
def get_http_client() -> Generator[httpx.AsyncClient, None, None]:
    client = httpx.AsyncClient()
    try:
        yield client
    finally:
        # important: avoid resource warnings in tests
        try:
            import anyio
            anyio.from_thread.run(client.aclose)  # safe even if not running in loop
        except Exception:
            # fallback: best effort
            pass


# --- repositories ---
def get_files_repository(
    settings: Settings = Depends(get_settings),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> HttpFilesRepository:
    return HttpFilesRepository(public_base_url=settings.FILE_SERVER, client=client)


# --- services ---
def get_health_service(settings: Settings = Depends(get_settings)) -> HealthService:
    return HealthService(settings=settings, started_at_monotonic=_started_at)


def get_file_service(
    settings: Settings = Depends(get_settings),
    repo: HttpFilesRepository = Depends(get_files_repository),
) -> FileService:
    return FileService(settings=settings, repo=repo)
