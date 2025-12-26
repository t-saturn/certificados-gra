from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

from redis import Redis

from pdfsvc.application.ports.queue_repository import QueueRepository


@dataclass(frozen=True)
class RedisQueueRepository(QueueRepository):
    redis: Redis

    def enqueue(self, queue_name: str, payload: Dict[str, Any]) -> None:
        self.redis.lpush(queue_name, json.dumps(payload))

    def dequeue_blocking(self, queue_name: str, timeout_seconds: int = 5) -> Optional[Dict[str, Any]]:
        item = self.redis.brpop(queue_name, timeout=timeout_seconds)
        if not item:
            return None
        _, raw = item
        return json.loads(raw)
