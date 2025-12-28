from __future__ import annotations

from dataclasses import dataclass
from redis import Redis

from pdfsvc.application.ports.lock_repository import LockRepository


@dataclass(frozen=True)
class RedisLockRepository(LockRepository):
    redis: Redis
    key_prefix: str = "pdfsvc"

    def acquire(self, key: str, ttl_seconds: int) -> bool:
        full_key = f"{self.key_prefix}:lock:{key}"
        ok = self.redis.set(full_key, "1", nx=True, ex=ttl_seconds)
        return bool(ok)

    def release(self, key: str) -> None:
        full_key = f"{self.key_prefix}:lock:{key}"
        self.redis.delete(full_key)
