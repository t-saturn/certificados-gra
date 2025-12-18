from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.generate_doc import router as generate_doc_router


def build_router() -> APIRouter:
    api = APIRouter()
    api.include_router(health_router)
    api.include_router(generate_doc_router)
    return api
