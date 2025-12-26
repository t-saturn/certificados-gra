from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from redis import Redis

from pdfsvc.application.ports.job_repository import JobRepository


@dataclass(frozen=True)
class RedisJobRepository(JobRepository):
    redis: Redis
    key_prefix: str = "pdfsvc"

    def _batch_key(self, batch_id: str) -> str:
        return f"{self.key_prefix}:batch:{batch_id}"

    def _job_key(self, job_id: str) -> str:
        return f"{self.key_prefix}:job:{job_id}"

    def create_batch(self, batch_id: str, data: Dict[str, Any], ttl_seconds: int) -> None:
        key = self._batch_key(batch_id)
        self.redis.hset(key, mapping=data)
        self.redis.expire(key, ttl_seconds)

    def create_job(self, job_id: str, data: Dict[str, Any], ttl_seconds: int) -> None:
        key = self._job_key(job_id)
        self.redis.hset(key, mapping=data)
        self.redis.expire(key, ttl_seconds)

    def update_job(self, job_id: str, data: Dict[str, Any], ttl_seconds: int | None = None) -> None:
        key = self._job_key(job_id)
        self.redis.hset(key, mapping=data)
        if ttl_seconds is not None:
            self.redis.expire(key, ttl_seconds)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        key = self._job_key(job_id)
        data = self.redis.hgetall(key)
        return data or None
