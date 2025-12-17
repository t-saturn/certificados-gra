from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.files import router as files_router


def build_router() -> APIRouter:
    router = APIRouter()
    router.include_router(health_router)
    router.include_router(files_router)
    return router
