from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class QueueRepository(ABC):
    @abstractmethod
    def enqueue(self, queue_name: str, payload: Dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def dequeue_blocking(self, queue_name: str, timeout_seconds: int = 5) -> Optional[Dict[str, Any]]:
        raise NotImplementedError
