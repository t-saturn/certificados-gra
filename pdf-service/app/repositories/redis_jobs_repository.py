from __future__ import annotations
import json
from typing import Any
from redis.asyncio import Redis

from app.core.config import Settings
from app.repositories.jobs_repository import JobsRepository

class RedisJobsRepository(JobsRepository):
    def __init__(self, redis: Redis, settings: Settings) -> None:
        self.redis = redis
        self.settings = settings

    def _meta_key(self, job_id: str) -> str:
        return f"job:{job_id}:meta"

    def _results_key(self, job_id: str) -> str:
        return f"job:{job_id}:results"

    def _errors_key(self, job_id: str) -> str:
        return f"job:{job_id}:errors"

    async def create_job(self, job_id: str, total: int) -> None:
        meta_key = self._meta_key(job_id)
        await self.redis.hset(meta_key, mapping={
            "status": "QUEUED",
            "total": total,
            "processed": 0,
            "failed": 0,
        })
        ttl = int(self.settings.REDIS_JOB_TTL_SECONDS)
        await self.redis.expire(meta_key, ttl)
        await self.redis.expire(self._results_key(job_id), ttl)
        await self.redis.expire(self._errors_key(job_id), ttl)

    async def push_job(self, payload: dict[str, Any]) -> None:
        queue_key = self.settings.REDIS_QUEUE_PDF_JOBS
        await self.redis.lpush(queue_key, json.dumps(payload))

    async def get_meta(self, job_id: str) -> dict[str, Any]:
        return await self.redis.hgetall(self._meta_key(job_id))

    async def get_results(self, job_id: str, start: int = 0, end: int = -1) -> list[str]:
        return await self.redis.lrange(self._results_key(job_id), start, end)
