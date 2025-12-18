# app/core/redis.py
from __future__ import annotations

import structlog
from redis.asyncio import Redis

from app.core.config import Settings

log = structlog.get_logger("redis")

_redis: Redis | None = None


def build_redis(settings: Settings) -> Redis:
    return Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=(settings.REDIS_PASSWORD.get_secret_value() if settings.REDIS_PASSWORD else None),
        decode_responses=True,
    )


def get_redis(settings: Settings) -> Redis:
    global _redis
    if _redis is None:
        _redis = build_redis(settings)
    return _redis


async def ping_redis(redis: Redis) -> bool:
    try:
        return bool(await redis.ping())
    except Exception as e:
        log.error("redis_ping_failed", error=str(e))
        return False


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        try:
            await _redis.aclose()
        finally:
            _redis = None
