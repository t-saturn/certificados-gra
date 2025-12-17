from fastapi import APIRouter
from app.api.routes.health import router as health_router


def build_router() -> APIRouter:
    router = APIRouter()
    router.include_router(health_router)
    return router
