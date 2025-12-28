from __future__ import annotations

from redis import Redis
import structlog

from pdfsvc.config.settings import Settings


def create_redis(settings: Settings, logger: structlog.BoundLogger) -> Redis:
    redis = Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=settings.REDIS_PASSWORD or None,
        decode_responses=True,
    )

    redis.ping()
    logger.info("redis_connected", host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
    return redis
