from __future__ import annotations

from abc import ABC, abstractmethod


class LockRepository(ABC):
    @abstractmethod
    def acquire(self, key: str, ttl_seconds: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def release(self, key: str) -> None:
        raise NotImplementedError
