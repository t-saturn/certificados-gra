from fastapi import APIRouter, Depends, Query
from app.deps import get_health_service
from app.services.health_service import HealthService

router = APIRouter(tags=["health"])

@router.get("/health")
def health(
    info: bool = Query(False),
    health_service: HealthService = Depends(get_health_service),
):
    return health_service.info() if info else health_service.basic()
