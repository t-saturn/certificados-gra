from __future__ import annotations

from fastapi import FastAPI
import structlog

from app.api import build_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.middleware import request_logger

log = structlog.get_logger("app")


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings)

    log.info("startup", env=settings.ENV)

    app = FastAPI(title="FastAPI Backend", version="1.0.0")
    app.middleware("http")(request_logger)
    app.include_router(build_router())
    return app


app = create_app()
