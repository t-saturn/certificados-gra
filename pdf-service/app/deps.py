from __future__ import annotations

import time
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.services.health_service import HealthService

_started_at = time.monotonic()


def get_health_service(settings: Settings = Depends(get_settings)) -> HealthService:
    return HealthService(settings=settings, started_at_monotonic=_started_at)
