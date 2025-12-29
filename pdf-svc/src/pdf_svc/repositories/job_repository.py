"""
Job repository for Redis persistence.
"""

from __future__ import annotations

from typing import Optional, Protocol
from uuid import UUID

import orjson
from redis.asyncio import Redis

from pdf_svc.config.settings import get_settings
from pdf_svc.models.job import Job
from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


class JobRepositoryProtocol(Protocol):
    """Protocol for job repository implementations."""

    async def save(self, job: Job) -> None:
        """Save job to storage."""
        ...

    async def get(self, job_id: UUID) -> Optional[Job]:
        """Get job by ID."""
        ...

    async def delete(self, job_id: UUID) -> bool:
        """Delete job by ID."""
        ...

    async def exists(self, job_id: UUID) -> bool:
        """Check if job exists."""
        ...


class RedisJobRepository:
    """
    Redis-based job repository.

    Stores jobs as JSON with TTL.
    """

    def __init__(self, redis: Redis, prefix: str = "pdfsvc", ttl_seconds: int = 3600):
        self._redis = redis
        self._prefix = prefix
        self._ttl = ttl_seconds

    def _key(self, job_id: UUID) -> str:
        """Generate Redis key for job."""
        return f"{self._prefix}:job:{job_id}"

    async def save(self, job: Job) -> None:
        """
        Save job to Redis with TTL.

        Args:
            job: Job instance to save
        """
        key = self._key(job.id)
        data = orjson.dumps(job.model_dump(mode="json"))

        await self._redis.setex(key, self._ttl, data)
        logger.debug("job_saved", job_id=str(job.id), status=job.status)

    async def get(self, job_id: UUID) -> Optional[Job]:
        """
        Get job by ID from Redis.

        Args:
            job_id: Job UUID

        Returns:
            Job instance or None if not found
        """
        key = self._key(job_id)
        data = await self._redis.get(key)

        if not data:
            logger.debug("job_not_found", job_id=str(job_id))
            return None

        job_dict = orjson.loads(data)
        job = Job.model_validate(job_dict)
        logger.debug("job_retrieved", job_id=str(job_id), status=job.status)
        return job

    async def delete(self, job_id: UUID) -> bool:
        """
        Delete job from Redis.

        Args:
            job_id: Job UUID

        Returns:
            True if deleted, False if not found
        """
        key = self._key(job_id)
        result = await self._redis.delete(key)
        deleted = result > 0
        logger.debug("job_deleted", job_id=str(job_id), success=deleted)
        return deleted

    async def exists(self, job_id: UUID) -> bool:
        """
        Check if job exists in Redis.

        Args:
            job_id: Job UUID

        Returns:
            True if exists
        """
        key = self._key(job_id)
        return await self._redis.exists(key) > 0

    async def update_status(self, job_id: UUID, status: str, **kwargs) -> Optional[Job]:
        """
        Update job status and save.

        Args:
            job_id: Job UUID
            status: New status
            **kwargs: Additional fields to update

        Returns:
            Updated job or None if not found
        """
        job = await self.get(job_id)
        if not job:
            return None

        job.status = status
        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)

        await self.save(job)
        return job

    async def get_all_by_status(self, status: str) -> list[Job]:
        """
        Get all jobs with a specific status.

        Note: This scans keys, use sparingly.

        Args:
            status: Job status to filter by

        Returns:
            List of jobs with matching status
        """
        pattern = f"{self._prefix}:job:*"
        jobs = []

        async for key in self._redis.scan_iter(match=pattern):
            data = await self._redis.get(key)
            if data:
                job_dict = orjson.loads(data)
                if job_dict.get("status") == status:
                    jobs.append(Job.model_validate(job_dict))

        logger.debug("jobs_by_status", status=status, count=len(jobs))
        return jobs


def create_job_repository(redis: Redis) -> RedisJobRepository:
    """Factory function to create job repository."""
    settings = get_settings()
    return RedisJobRepository(
        redis=redis,
        prefix=settings.redis.key_prefix,
        ttl_seconds=settings.redis.job_ttl_seconds,
    )
