from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class JobRepository(ABC):
    @abstractmethod
    def create_batch(self, batch_id: str, data: Dict[str, Any], ttl_seconds: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def create_job(self, job_id: str, data: Dict[str, Any], ttl_seconds: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def update_job(self, job_id: str, data: Dict[str, Any], ttl_seconds: int | None = None) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError
