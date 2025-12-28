# app/main.py
from __future__ import annotations

from fastapi import FastAPI
import structlog

from app.api import build_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.middleware import request_logger
from app.core.redis import get_redis, ping_redis, close_redis

log = structlog.get_logger("app")


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings)

    log.info("startup", env=settings.ENV)

    app = FastAPI(title="FastAPI Backend", version="1.0.0")
    app.middleware("http")(request_logger)
    app.include_router(build_router())

    @app.on_event("startup")
    async def _startup() -> None:
        redis = get_redis(settings)
        ok = await ping_redis(redis)
        if ok:
            log.info(
                "redis_connected",
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
            )
        else:
            # Nota: NO crasheo el servicio; solo aviso.
            # Si quieres que sea obligatorio, aquí podrías levantar excepción.
            log.error(
                "redis_connection_failed",
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
            )

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await close_redis()
        log.info("redis_closed")

    return app


app = create_app()
