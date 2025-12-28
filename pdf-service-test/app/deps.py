from __future__ import annotations

import time
from pathlib import Path
from typing import AsyncGenerator
from redis.asyncio import Redis
from fastapi import Depends
import httpx

from app.core.redis import get_redis
from app.core.config import Settings, get_settings

from app.repositories.redis_jobs_repository import RedisJobsRepository
from app.repositories.jobs_repository import JobsRepository
from app.repositories.files_repository import HttpFilesRepository

from app.services.jobs_service import JobsService
from app.services.file_service import FileService
from app.services.health_service import HealthService
from app.services.qr_service import QrService
from app.services.pdf_service import PdfService
from app.services.pdf_generation_service import PdfGenerationService

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


def get_pdf_service() -> PdfService:
    return PdfService()

def get_pdf_generation_service(
    settings: Settings = Depends(get_settings),
    file_svc: FileService = Depends(get_file_service),
    qr_svc: QrService = Depends(get_qr_service),
    pdf_svc: PdfService = Depends(get_pdf_service),
) -> PdfGenerationService:
    return PdfGenerationService(
        settings=settings,
        file_service=file_svc,
        qr_service=qr_svc,
        pdf_service=pdf_svc,
    )

def get_redis_client(settings: Settings = Depends(get_settings)) -> Redis:
    return get_redis(settings)

def get_jobs_repository(
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis_client),
) -> JobsRepository:
    return RedisJobsRepository(redis=redis, settings=settings)

def get_jobs_service(
    repo: JobsRepository = Depends(get_jobs_repository),
) -> JobsService:
    return JobsService(repo=repo)