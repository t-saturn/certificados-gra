from __future__ import annotations

import time
from pathlib import Path
from typing import AsyncGenerator

import httpx
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.repositories.files_repository import HttpFilesRepository
from app.services.file_service import FileService
from app.services.health_service import HealthService
from app.services.qr_service import QrService

# --- shared app startup time (used by health) ---
_started_at = time.monotonic()


# --- http client lifecycle ---
async def get_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    FastAPI dependency with proper async lifecycle.
    Ensures the AsyncClient is closed after request (or test).
    """
    async with httpx.AsyncClient() as client:
        yield client


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


def get_qr_service() -> QrService:
    logo_path = Path(__file__).resolve().parent / "assets" / "logo.png"
    return QrService(logo_path=logo_path)
