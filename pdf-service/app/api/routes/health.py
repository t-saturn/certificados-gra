from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.deps import get_health_service
from app.services.health_service import HealthService

router = APIRouter(tags=["health"])


@router.get("/health")
def health(
    info: bool = Query(False, description="If true, returns extended diagnostics"),
    settings: Settings = Depends(get_settings),
    health_service: HealthService = Depends(get_health_service),
):
    _ = settings
    return health_service.info() if info else health_service.basic()
