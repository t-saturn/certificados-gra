from __future__ import annotations

from dataclasses import dataclass
from redis import Redis


@dataclass(frozen=True)
class RedisClientFactory:
    host: str
    port: int
    db: int
    password: str

    def create(self) -> Redis:
        return Redis(
            host=self.host,
            port=self.port,
            db=self.db,
            password=self.password or None,
            decode_responses=True,  # important for JSON/hashes
        )
